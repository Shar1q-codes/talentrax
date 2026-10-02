/**
 * The worker's logic against a fake queue and a fake Storage API. The fake
 * queue mirrors migration 7's semantics - a lease per claim, a token per
 * lease, outcomes decided by whether the object still exists - so these
 * tests exercise the worker; 30_storage_worker.test.sql proves the real
 * queue behaves the same way.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { drain, errorCodeOf, type ClaimedRow, type ErasureQueue, type ObjectStore } from "./drain.ts";

type Row = {
  id: string;
  bucket: string;
  path: string;
  status: "pending" | "done";
  outcome?: string;
  error?: string;
  token?: string;
  leased: boolean;
  attempts: number;
  presentAtClaim?: boolean;
};

/** A world: objects that exist, and a queue over them. */
function world(rows: Array<{ bucket: string; path: string; exists: boolean }>) {
  const objects = new Set(rows.filter((r) => r.exists).map((r) => `${r.bucket}/${r.path}`));
  const queueRows: Row[] = rows.map((r, i) => ({
    id: `row-${i}`,
    bucket: r.bucket,
    path: r.path,
    status: "pending",
    leased: false,
    attempts: 0,
  }));
  let tokens = 0;

  const queue: ErasureQueue = {
    async claim(limit) {
      const due = queueRows.filter((r) => r.status === "pending" && !r.leased).slice(0, limit);
      return due.map((r): ClaimedRow => {
        r.leased = true;
        r.attempts += 1;
        r.token = `token-${++tokens}`;
        r.presentAtClaim = objects.has(`${r.bucket}/${r.path}`);
        return { id: r.id, bucket: r.bucket, object_path: r.path, claim_token: r.token, present: r.presentAtClaim };
      });
    },
    async complete(id, token) {
      const r = queueRows.find((x) => x.id === id)!;
      if (r.status !== "pending" || r.token !== token) return "stale";
      if (objects.has(`${r.bucket}/${r.path}`)) {
        r.error = "still_present";
        r.leased = false;
        return "still_present";
      }
      // As complete_storage_erasure() decides it: from presence at claim.
      r.status = "done";
      r.outcome = r.presentAtClaim ? "deleted" : "already_absent";
      return r.outcome;
    },
    async fail(id, token, code) {
      const r = queueRows.find((x) => x.id === id)!;
      if (r.status !== "pending" || r.token !== token) return "stale";
      r.error = code;
      return "failed";
    },
  };
  return { objects, queueRows, queue };
}

/** A Storage API that removes what exists and accepts what does not, like the real one. */
function storage(objects: Set<string>, behaviour: { failBucket?: string; throwBucket?: string; calls?: string[] } = {}): ObjectStore {
  return {
    async remove(bucket, paths) {
      behaviour.calls?.push(`${bucket}:${paths.join(",")}`);
      if (bucket === behaviour.throwBucket) throw new TypeError("fetch failed");
      if (bucket === behaviour.failBucket) return { ok: false, errorCode: "http_503" };
      for (const p of paths) objects.delete(`${bucket}/${p}`);
      return { ok: true };
    },
  };
}

describe("drain", () => {
  it("deletes what exists and completes what was already gone, without calling Storage for it", async () => {
    const w = world([
      { bucket: "candidate-originals", path: "a.pdf", exists: true },
      { bucket: "candidate-originals", path: "gone.pdf", exists: false },
    ]);
    const calls: string[] = [];
    const stats = await drain(w.queue, storage(w.objects, { calls }), { batchSize: 10, maxBatches: 5 });
    assert.deepEqual(calls, ["candidate-originals:a.pdf"], "an object absent at claim is not sent to Storage");
    assert.equal(w.objects.size, 0);
    assert.ok(w.queueRows.every((r) => r.status === "done"));
    assert.equal(stats.claimed, 2);
    assert.equal(stats.deleted, 1);
    assert.equal(stats.alreadyAbsent, 1);
    assert.deepEqual(w.queueRows.map((r) => r.outcome), ["deleted", "already_absent"]);
  });

  it("groups one delete call per bucket", async () => {
    const w = world([
      { bucket: "candidate-originals", path: "o1.pdf", exists: true },
      { bucket: "candidate-scrubbed", path: "s1.pdf", exists: true },
      { bucket: "candidate-originals", path: "o2.pdf", exists: true },
    ]);
    const calls: string[] = [];
    await drain(w.queue, storage(w.objects, { calls }), { batchSize: 10, maxBatches: 5 });
    assert.deepEqual(calls.sort(), ["candidate-originals:o1.pdf,o2.pdf", "candidate-scrubbed:s1.pdf"]);
  });

  it("records an unreachable Storage API as a failure with a code, never as success", async () => {
    const w = world([
      { bucket: "candidate-originals", path: "a.pdf", exists: true },
      { bucket: "candidate-scrubbed", path: "b.pdf", exists: true },
    ]);
    const stats = await drain(w.queue, storage(w.objects, { failBucket: "candidate-originals", throwBucket: "candidate-scrubbed" }), {
      batchSize: 10,
      maxBatches: 1,
    });
    assert.equal(stats.failed, 2);
    assert.deepEqual(
      w.queueRows.map((r) => [r.status, r.error]),
      [["pending", "http_503"], ["pending", "network"]],
      "an HTTP error and a thrown network error both stay pending, with what went wrong",
    );
  });

  it("does not believe its own success: an object still present is refused by the queue", async () => {
    const w = world([{ bucket: "candidate-originals", path: "a.pdf", exists: true }]);
    // A Storage API that answers OK and deletes nothing - a wrong key, say.
    const liar: ObjectStore = { remove: async () => ({ ok: true }) };
    const stats = await drain(w.queue, liar, { batchSize: 10, maxBatches: 1 });
    assert.equal(stats.failed, 1);
    assert.equal(w.queueRows[0].status, "pending");
    assert.equal(w.queueRows[0].error, "still_present");
  });

  it("two workers draining at once handle each row exactly once", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ bucket: "candidate-originals", path: `f${i}.pdf`, exists: true }));
    const w = world(rows);
    const calls: string[] = [];
    const store = storage(w.objects, { calls });
    const [a, b] = await Promise.all([
      drain(w.queue, store, { batchSize: 4, maxBatches: 10 }),
      drain(w.queue, store, { batchSize: 4, maxBatches: 10 }),
    ]);
    assert.equal(a.claimed + b.claimed, 25, "every row claimed once between them");
    const sent = calls.flatMap((c) => c.split(":")[1].split(","));
    assert.equal(new Set(sent).size, sent.length, "no object sent to Storage twice");
    assert.ok(w.queueRows.every((r) => r.status === "done"));
  });

  it("is idempotent: a second run over a drained queue does nothing", async () => {
    const w = world([{ bucket: "candidate-originals", path: "a.pdf", exists: true }]);
    await drain(w.queue, storage(w.objects), { batchSize: 10, maxBatches: 5 });
    const calls: string[] = [];
    const again = await drain(w.queue, storage(w.objects, { calls }), { batchSize: 10, maxBatches: 5 });
    assert.equal(again.claimed, 0);
    assert.deepEqual(calls, []);
  });

  it("stops after maxBatches so one invocation stays bounded", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ bucket: "candidate-originals", path: `f${i}.pdf`, exists: true }));
    const w = world(rows);
    const stats = await drain(w.queue, storage(w.objects), { batchSize: 2, maxBatches: 3 });
    assert.equal(stats.batches, 3);
    assert.equal(stats.claimed, 6);
  });
});

describe("errorCodeOf", () => {
  it("keeps an HTTP status from a Storage error", () => {
    assert.equal(errorCodeOf({ status: 503 }), "http_503");
    assert.equal(errorCodeOf({ statusCode: "404" }), "http_404");
  });
  it("calls anything else a network failure", () => {
    assert.equal(errorCodeOf(new TypeError("fetch failed")), "network");
    assert.equal(errorCodeOf(undefined), "network");
  });
});
