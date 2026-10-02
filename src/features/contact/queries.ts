/**
 * The submit seam for the general contact form.
 *
 * There is no backend on this site yet, so nothing is transmitted: the
 * validated payload is written to the browser console and the seam answers
 * `unavailable`. The form says the form is not open yet and nothing was sent;
 * it never claims the message was received.
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
 *   if (!response.ok) return { ok: false, reason: "failed" };
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

/**
 * `unavailable`: the form is not connected to anything, so nothing was sent.
 * The form says exactly that. When the endpoint exists, a failed request
 * returns `{ ok: false, reason: "failed" }` with copy of its own.
 */
export type SubmitResult = { ok: true } | { ok: false; reason: "unavailable" };

export async function submitContact(
  payload: ContactPayload,
): Promise<SubmitResult> {
  // Stands in for the API call sketched above.
  console.log("[contact] message payload", payload);
  return { ok: false, reason: "unavailable" };
}
