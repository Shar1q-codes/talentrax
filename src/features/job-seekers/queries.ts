/**
 * The submit seam for the Upload Resume form. Four steps, from the visitor's
 * browser (supabase/STORAGE.md):
 *
 *   1. Insert the intake row with the publishable key - the visitor's own
 *      request, so the rate limit (migration 9) sees the visitor. The row
 *      declares the file: name, type and size. It holds no path: anon
 *      cannot set one (migration 8).
 *   2. Ask our server for a slot (requestResumeUploadAction). It finds the
 *      row by the submission key, assigns the path under the row's id, and
 *      returns a signed upload token for exactly that path.
 *   3. Upload the file straight to Storage with that token. The bytes never
 *      pass through our server or this site's logs.
 *   4. Ask our server to check what arrived (completeResumeUploadAction):
 *      size, stored type and the file's own first bytes. Kept, or rejected
 *      and queued for deletion.
 *
 * A retry with the same submission key picks up wherever the last try
 * stopped: the insert is recognised as a retry and stores nothing, the slot
 * is the same path, an upload already there is not repeated, and a check
 * already made is reported, not made again.
 *
 * NOTHING IS LOGGED. This used to console.log the payload while the form was
 * unwired; it now carries a résumé to a database.
 *
 * NO EEO OR DEMOGRAPHIC DATA passes through here. See the note at the top of
 * content/upload-resume.ts.
 */

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { toIntakeResult, type IntakeResult } from "@/lib/supabase/intake-result";

import { completeResumeUploadAction, requestResumeUploadAction } from "./actions";
import { declaredType } from "./resume-check";

export type ApplicationPayload = {
  /** A UUID, generated once per submission and resent on its retries. */
  submissionKey: string;
  /**
   * A spam trap tripped more than once in this attempt. The row is stored
   * and held for staff review, never refused (migration 13).
   */
  trapTripped: boolean;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
    location: { city: string; state: string };
    /** Optional; empty string when not given. */
    linkedinUrl: string;
    /** Optional; empty string when not given. */
    message: string;
  };
  preferences: {
    /** "<area>:<sub-specialty>", e.g. "healthcare:nursing". */
    specialty: string;
    /** "authorized" | "needs-sponsorship". A plain yes/no, no visa detail. */
    workAuthorization: string;
    /** Engagement model ids, e.g. ["contract", "direct-hire"]. */
    engagementTypes: string[];
  };
  consent: {
    /** Required to submit. Storing the resume and contacting about roles. */
    storeAndContact: boolean;
    /** Separate and optional. Contact about roles beyond those selected. */
    futureRoles: boolean;
  };
  resume: File;
};

/**
 * The intake outcomes, plus one only this form has: `file_rejected`, the
 * details were stored but the file was not what its name said, and it was
 * not kept.
 */
export type SubmitResult = IntakeResult | { ok: false; reason: "file_rejected" };

const BUCKET = "resume-intake";

export async function submitApplication(payload: ApplicationPayload): Promise<SubmitResult> {
  const { applicant, preferences, consent, resume } = payload;
  // The type the form declares comes from the extension the form already
  // checked, not from the browser's guess, which is often empty for .doc.
  const mimeType = declaredType(resume.name);
  if (!mimeType) return { ok: false, reason: "failed" };
  const [desk, specialty] = preferences.specialty.split(":");

  try {
    const supabase = createBrowserSupabaseClient();
    const inserted = toIntakeResult(
      await supabase.from("resume_submissions").insert({
        submission_key: payload.submissionKey,
        trap_tripped: payload.trapTripped,
        full_name: applicant.fullName,
        email: applicant.email,
        phone: applicant.phone,
        city: applicant.location.city,
        state: applicant.location.state,
        linkedin_url: applicant.linkedinUrl === "" ? null : applicant.linkedinUrl,
        message: applicant.message === "" ? null : applicant.message,
        desk,
        specialty,
        work_authorized: preferences.workAuthorization === "authorized",
        engagement_types: preferences.engagementTypes,
        consent_store: consent.storeAndContact,
        consent_future_roles: consent.futureRoles,
        resume_filename: resume.name,
        resume_mime_type: mimeType,
        resume_size_bytes: resume.size,
      }),
    );
    if (!inserted.ok) return inserted;

    const slot = await requestResumeUploadAction(payload.submissionKey);
    if (slot.state === "refused") return { ok: false, reason: "failed" };
    if (slot.state === "received") return { ok: true };
    if (slot.state === "rejected") return { ok: false, reason: "file_rejected" };
    if (slot.state === "upload") {
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(slot.path, slot.token, resume, { contentType: mimeType });
      if (error) return { ok: false, reason: "failed" };
    }

    const checked = await completeResumeUploadAction(payload.submissionKey);
    if (checked === "received") return { ok: true };
    if (checked === "rejected") return { ok: false, reason: "file_rejected" };
    return { ok: false, reason: "failed" };
  } catch {
    // A client that could not be built, a dropped connection, an action
    // that never answered. A retry with the same key resumes from here.
    return { ok: false, reason: "failed" };
  }
}
