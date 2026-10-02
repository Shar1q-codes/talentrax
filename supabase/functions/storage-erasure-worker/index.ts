/**
 * storage-erasure-worker: drains public.storage_erasures through the Storage
 * API. See supabase/ERASURE.md, "Storage", and migration 7.
 *
 * Invoked by pg_cron over pg_net (private.invoke_storage_worker), or by
 * hand. Safe to run any number of times, and concurrently with itself: rows
 * are leased by the database, and every report carries the lease's token.
 *
 * Only the service role may call it: the bearer token must be this
 * project's service role key. A valid user or anon JWT is not enough.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import { drain, errorCodeOf, type ErasureQueue, type ObjectStore } from "./drain.ts";

const BATCH_SIZE = 100;
const MAX_BATCHES = 20;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Constant-time comparison, so the key cannot be guessed a byte at a time. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (request) => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json(500, { error: "worker is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }
  if (!sameSecret(request.headers.get("Authorization") ?? "", `Bearer ${serviceKey}`)) {
    return json(401, { error: "unauthorized" });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const queue: ErasureQueue = {
    async claim(limit) {
      const { data, error } = await db.rpc("claim_storage_erasures", { p_limit: limit });
      if (error) throw error;
      return data ?? [];
    },
    async complete(id, claimToken) {
      const { data, error } = await db.rpc("complete_storage_erasure", { p_id: id, p_claim_token: claimToken });
      if (error) throw error;
      return data as string;
    },
    async fail(id, claimToken, errorCode) {
      const { data, error } = await db.rpc("fail_storage_erasure", {
        p_id: id,
        p_claim_token: claimToken,
        p_error_code: errorCode,
      });
      if (error) throw error;
      return data as string;
    },
  };

  const store: ObjectStore = {
    async remove(bucket, paths) {
      const { error } = await db.storage.from(bucket).remove(paths);
      // A 200 says the API accepted the request, not that anything existed.
      // The database decides that, in complete_storage_erasure().
      return error ? { ok: false, errorCode: errorCodeOf(error) } : { ok: true };
    },
  };

  try {
    const stats = await drain(queue, store, { batchSize: BATCH_SIZE, maxBatches: MAX_BATCHES });
    const { data: backlog } = await db.rpc("storage_erasure_backlog");
    const health = Array.isArray(backlog) ? backlog[0] : backlog;
    if (stats.failed > 0 || (health && Number(health.needs_attention) > 0)) {
      // Lands in the function's logs at error level, where log alerting can see it.
      console.error(JSON.stringify({ event: "storage_erasure_failures", stats, backlog: health }));
    }
    return json(200, { stats, backlog: health });
  } catch (error) {
    console.error(JSON.stringify({ event: "storage_erasure_worker_error", error: errorCodeOf(error) }));
    return json(500, { error: "worker failed; rows it claimed will be retried when their lease expires" });
  }
});
