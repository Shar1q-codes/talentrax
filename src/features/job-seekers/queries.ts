/**
 * The submit seam for the Upload Resume form.
 *
 * There is no backend on this site yet, so nothing is transmitted and no file
 * leaves the browser: the validated payload is written to the console and the
 * form shows its success state.
 *
 * TODO(api): when the applications endpoint exists, this is the ONLY file
 * that changes. Keep the `SubmitResult` shape and the form picks up success
 * and failure with no edits of its own.
 *
 * The resume needs a two-step upload, NOT a multipart POST through this
 * function: ask the API for a presigned URL, PUT the File straight to object
 * storage from the browser, then submit the application with the returned
 * object key in place of the File. Posting the binary through the application
 * endpoint puts resume bytes through every proxy and log in between, which
 * for a document full of personal data is not a trade worth making.
 *
 *   const { uploadUrl, objectKey } = await (
 *     await fetch("/api/uploads/resume", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({
 *         filename: payload.resume.name,
 *         contentType: payload.resume.type,
 *         bytes: payload.resume.size,
 *       }),
 *     })
 *   ).json();
 *   await fetch(uploadUrl, { method: "PUT", body: payload.resume });
 *   const response = await fetch("/api/applications", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ ...payload, resume: { objectKey } }),
 *   });
 *   if (!response.ok) return { ok: false, message: "..." };
 *   return { ok: true };
 *
 * Note that an /api route would be the first backend code in this repo. See
 * CLAUDE.md: that is a deliberate architectural decision, not a detail to
 * settle inside a form component.
 *
 * NO EEO OR DEMOGRAPHIC DATA passes through here. See the note at the top of
 * content/upload-resume.ts: that collection is separate, later, and in the
 * ATS, so it cannot reach a screening decision.
 */

export type ApplicationPayload = {
  /** ISO 8601, set at submit time. */
  submittedAt: string;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
    location: { city: string; state: string };
    /** Optional; empty string when not given. */
    linkedinUrl: string;
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
  /**
   * Carried as the File object. Stubbed deliberately - see the TODO above:
   * this becomes { objectKey } once presigned uploads exist.
   */
  resume: File;
};

export type SubmitResult = { ok: true } | { ok: false; message: string };

export async function submitApplication(
  payload: ApplicationPayload,
): Promise<SubmitResult> {
  // Stands in for the two-step upload sketched above. The File is logged by
  // reference only; its contents are never read here.
  console.log("[upload-resume] application payload", {
    ...payload,
    resume: {
      name: payload.resume.name,
      type: payload.resume.type,
      bytes: payload.resume.size,
    },
  });
  return { ok: true };
}
