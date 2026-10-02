/**
 * The storage erasure worker's logic, with no Deno or network dependency so
 * it can be tested on Node (drain.test.ts). index.ts wires it to Supabase.
 *
 * What the worker does NOT decide: whether an object was deleted or was
 * already gone. The Storage API answers a bulk delete with 200 and only the
 * objects it removed - and it answers the same for a missing object, a
 * missing bucket and a caller not allowed to delete. So the worker reports
 * "I asked for these to be removed" and the database checks
 * storage.objects and records the outcome (migration 7). The worker only
 * distinguishes "the API accepted the request" from "it did not".
 */

export type ClaimedRow = {
  id: string;
  bucket: string;
  object_path: string;
  claim_token: string;
  /** Whether storage.objects held the object when the row was claimed. */
  present: boolean;
};

/** The database side. Every call is idempotent on the row's claim token. */
export interface ErasureQueue {
  claim(limit: number): Promise<ClaimedRow[]>;
  /** 'deleted' | 'already_absent' | 'still_present' | 'stale' */
  complete(id: string, claimToken: string): Promise<string>;
  /** 'failed' | 'stale' */
  fail(id: string, claimToken: string, errorCode: string): Promise<string>;
}

/**
 * The Storage side. `remove` resolves when the API accepted the request, and
 * rejects or returns an error code when it could not be reached or refused.
 */
export interface ObjectStore {
  remove(bucket: string, paths: string[]): Promise<{ ok: true } | { ok: false; errorCode: string }>;
}

export type DrainStats = {
  claimed: number;
  deleted: number;
  alreadyAbsent: number;
  failed: number;
  stale: number;
  batches: number;
};

export type DrainOptions = {
  /** Rows per claim. The Storage API accepts up to 1000 paths per delete. */
  batchSize: number;
  /** Stop after this many batches, so one invocation stays short. */
  maxBatches: number;
};

/** The Storage API's error codes are not ours; keep what fits the column. */
export function errorCodeOf(error: unknown): string {
  if (error && typeof error === "object") {
    const status = (error as { status?: unknown; statusCode?: unknown }).status
      ?? (error as { statusCode?: unknown }).statusCode;
    const n = typeof status === "string" ? Number.parseInt(status, 10) : status;
    if (typeof n === "number" && Number.isFinite(n) && n > 0) return `http_${n}`;
  }
  return "network";
}

async function finish(
  queue: ErasureQueue,
  row: ClaimedRow,
  stats: DrainStats,
): Promise<void> {
  const outcome = await queue.complete(row.id, row.claim_token);
  if (outcome === "deleted") stats.deleted += 1;
  else if (outcome === "already_absent") stats.alreadyAbsent += 1;
  else if (outcome === "stale") stats.stale += 1;
  else stats.failed += 1; // still_present: the database refused it and will retry
}

export async function drain(
  queue: ErasureQueue,
  store: ObjectStore,
  options: DrainOptions,
): Promise<DrainStats> {
  const stats: DrainStats = { claimed: 0, deleted: 0, alreadyAbsent: 0, failed: 0, stale: 0, batches: 0 };

  while (stats.batches < options.maxBatches) {
    const rows = await queue.claim(options.batchSize);
    if (rows.length === 0) break;
    stats.batches += 1;
    stats.claimed += rows.length;

    // Nothing to delete: the database already knows; let it record that.
    for (const row of rows.filter((r) => !r.present)) {
      await finish(queue, row, stats);
    }

    // One delete call per bucket.
    const byBucket = new Map<string, ClaimedRow[]>();
    for (const row of rows.filter((r) => r.present)) {
      const list = byBucket.get(row.bucket) ?? [];
      list.push(row);
      byBucket.set(row.bucket, list);
    }

    for (const [bucket, group] of byBucket) {
      let result: { ok: true } | { ok: false; errorCode: string };
      try {
        result = await store.remove(bucket, group.map((r) => r.object_path));
      } catch (error) {
        result = { ok: false, errorCode: errorCodeOf(error) };
      }

      for (const row of group) {
        if (result.ok) {
          await finish(queue, row, stats);
        } else {
          const outcome = await queue.fail(row.id, row.claim_token, result.errorCode);
          if (outcome === "stale") stats.stale += 1;
          else stats.failed += 1;
        }
      }
    }
  }

  return stats;
}
