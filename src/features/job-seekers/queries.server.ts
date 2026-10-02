import "server-only";

/**
 * The resume upload's server half: every call it makes, all with the secret
 * key (src/lib/supabase/admin.ts), which is why it exists. anon cannot read
 * its own intake row, so only the server can find the row for a submission
 * key, mint a signed upload URL for its path, read the bytes that arrived,
 * and say whether they are kept.
 *
 * What it may do to the row is two database functions (migration 17), not
 * free updates: claim_resume_upload and record_resume_check.
 *
 * NOTHING IS LOGGED: not the key, not the path, not the bytes.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

import { checkResume, type RejectedReason } from "./resume-check";

const BUCKET = "resume-intake";

export type UploadSlot =
  /** Upload the file to `path` with this token, then ask for the check. */
  | { state: "upload"; path: string; token: string }
  /** The file is already there: go straight to the check. */
  | { state: "uploaded" }
  /** Already decided, on an earlier try. */
  | { state: "received" }
  | { state: "rejected" }
  /** No such key, too old, or a file the bucket would not take. Indistinguishable. */
  | { state: "refused" };

type Claim = { state: string; storage_path: string; mime_type: string; size_bytes: number };

async function claim(submissionKey: string): Promise<Claim | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("claim_resume_upload", { p_submission_key: submissionKey });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as Claim;
}

export async function issueResumeUpload(submissionKey: string): Promise<UploadSlot> {
  const claimed = await claim(submissionKey);
  if (!claimed) return { state: "refused" };
  if (claimed.state === "received" || claimed.state === "rejected" || claimed.state === "uploaded") {
    return { state: claimed.state };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(claimed.storage_path);
  if (error || !data) return { state: "refused" };
  return { state: "upload", path: data.path, token: data.token };
}

export type CheckOutcome = "received" | "rejected" | "missing" | "refused";

/**
 * Reads what arrived and records the verdict. "missing": no object at the
 * path yet (the upload did not finish); the row stays undecided, and the
 * hourly expiry marks it not_received once its URL has lapsed.
 */
export async function checkResumeUpload(submissionKey: string): Promise<{ outcome: CheckOutcome; reason?: RejectedReason }> {
  const claimed = await claim(submissionKey);
  if (!claimed) return { outcome: "refused" };
  if (claimed.state === "received" || claimed.state === "rejected") return { outcome: claimed.state };
  if (claimed.state !== "uploaded") return { outcome: "missing" };

  const supabase = createAdminSupabaseClient();
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(claimed.storage_path);
  if (error || !blob) return { outcome: "missing" };

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const reason = checkResume(bytes, blob.type, { mimeType: claimed.mime_type, sizeBytes: Number(claimed.size_bytes) });

  const { data: recorded } = await supabase.rpc("record_resume_check", {
    p_submission_key: submissionKey,
    // Null means received. The generated types call every SQL argument
    // non-null; the function takes null and means it.
    p_rejected_reason: reason as string,
  });
  if (recorded === "received") return { outcome: "received" };
  if (recorded === "rejected") return { outcome: "rejected", reason: reason ?? undefined };
  // Decided by a concurrent try in the meantime: report what was decided.
  const after = await claim(submissionKey);
  if (after?.state === "received" || after?.state === "rejected") return { outcome: after.state };
  return { outcome: "refused" };
}
