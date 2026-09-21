/**
 * The submit seam for the general contact form.
 *
 * There is no backend on this site yet, so nothing is transmitted: the
 * validated payload is written to the browser console and the form shows its
 * success state.
 *
 * TODO(api): when the endpoint exists, this is the ONLY file that changes.
 * Keep the `SubmitResult` shape and the form picks up success and failure
 * with no edits of its own.
 *
 *   const response = await fetch("/api/contact", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 *   if (!response.ok) return { ok: false, message: "..." };
 *   return { ok: true };
 *
 * Whoever wires this up needs a destination inbox, which does not exist yet -
 * see CLIENT-CONFIRM.md item 8. The same answer unblocks the contact details
 * on /contact and the data-rights address in the privacy policy.
 *
 * Note that an /api route would be the first backend code in this repo. See
 * CLAUDE.md: that is a deliberate architectural decision, not a detail to
 * settle inside a form component.
 */

export type ContactPayload = {
  /** ISO 8601, set at submit time. */
  submittedAt: string;
  fullName: string;
  email: string;
  /** Optional; empty string when not given. */
  phone: string;
  /** "employer" | "job-seeker". Routes the message to the right desk. */
  enquiryType: string;
  subject: string;
  message: string;
};

export type SubmitResult = { ok: true } | { ok: false; message: string };

export async function submitContact(
  payload: ContactPayload,
): Promise<SubmitResult> {
  // Stands in for the API call sketched above.
  console.log("[contact] message payload", payload);
  return { ok: true };
}
