"use server";

/**
 * The resume upload's two endpoints: a slot to upload into, and the check
 * on what arrived. Server actions rather than route handlers, for one
 * reason: the staff session cookie is scoped to /staff (lib/supabase/
 * server.ts), and a server action posts to the page it is called from. On
 * /staff/upload-resume the cookie comes with the call, so staff can use the
 * form in production before the public can. On the public page it never
 * does, and none is needed once the form is released.
 *
 * WHO MAY CALL THEM. Each call checks for itself:
 *   - the public form is open (resumeFormOpenToPublic: not production, or
 *     production with the release gate cleared); or
 *   - the staff form is open and the caller is staff past both sign-in
 *     steps.
 * Anything else is refused, and reads like any other refusal.
 *
 * Neither trusts its argument beyond its shape: a submission key is a v4
 * UUID that only the browser that inserted the row knows, honoured for
 * fifteen minutes (migration 17).
 *
 * NOTHING IS LOGGED.
 */

import { getStaffAccess } from "@/features/auth/server";
import { resumeFormOpenToPublic, resumeFormOpenToStaff } from "@/lib/supabase/forms-gate";

import { checkResumeUpload, issueResumeUpload, type CheckOutcome, type UploadSlot } from "./queries.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function mayUpload(): Promise<boolean> {
  if (resumeFormOpenToPublic()) return true;
  if (!resumeFormOpenToStaff()) return false;
  return (await getStaffAccess()).state === "signed_in";
}

export async function requestResumeUploadAction(submissionKey: string): Promise<UploadSlot> {
  if (typeof submissionKey !== "string" || !UUID.test(submissionKey)) return { state: "refused" };
  if (!(await mayUpload())) return { state: "refused" };
  return issueResumeUpload(submissionKey);
}

export async function completeResumeUploadAction(submissionKey: string): Promise<CheckOutcome> {
  if (typeof submissionKey !== "string" || !UUID.test(submissionKey)) return "refused";
  if (!(await mayUpload())) return "refused";
  return (await checkResumeUpload(submissionKey)).outcome;
}
