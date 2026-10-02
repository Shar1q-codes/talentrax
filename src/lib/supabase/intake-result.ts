// What a public form's insert came to, in the terms the form shows a visitor.
// Shared by every wired form's queries.ts, so they cannot read the same
// database answer three different ways.
//
//   ok            The row was stored. Also what a retry gets (a submission
//                 the database already has: nothing new is stored), and what
//                 a submission held for review gets (the per-email limit
//                 never refuses). Migration 9.
//   rate_limited  HTTP 429. The wait comes from the error body's `details`
//                 (migration 12): a browser cannot read the Retry-After
//                 header cross-origin. Null if it is missing or unreadable.
//   failed        Anything else: no network, a refused insert, an outage.
//                 Nothing reached us, or nothing we can confirm did.

import type { PostgrestError } from "@supabase/supabase-js";

export type IntakeResult =
  | { ok: true }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number | null }
  | { ok: false; reason: "failed" };

export function toIntakeResult(response: {
  error: PostgrestError | null;
  status: number;
}): IntakeResult {
  const { error, status } = response;
  if (!error) return { ok: true };
  if (status === 429 || error.code === "rate_limited") {
    const seconds = Number.parseInt(error.details ?? "", 10);
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null,
    };
  }
  return { ok: false, reason: "failed" };
}
