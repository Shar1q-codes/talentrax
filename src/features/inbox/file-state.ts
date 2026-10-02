/**
 * What a resume row says about its file, as one state the inbox can show
 * before anyone opens it. Pure, so npm test pins it.
 *
 *   received       checked and kept: the only state that may be downloaded
 *   refused        failed the check on what it really is; being deleted
 *   never_arrived  an upload was started and nothing came before it lapsed
 *   not_checked    a path exists and no verdict yet: uploaded and unchecked,
 *                  or still on its way. Opening the row runs the check.
 *   none           no upload was ever started
 */

import type { FileStateId } from "@/content/inbox";

export type ResumeFileColumns = {
  resume_storage_path: string | null;
  resume_received_at: string | null;
  resume_rejected_at: string | null;
  resume_rejected_reason: string | null;
};

export function fileStateOf(row: ResumeFileColumns): FileStateId {
  if (row.resume_received_at) return "received";
  if (row.resume_rejected_at) return row.resume_rejected_reason === "not_received" ? "never_arrived" : "refused";
  if (!row.resume_storage_path) return "none";
  return "not_checked";
}
