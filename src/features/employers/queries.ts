/**
 * The submit seam for the Request Talent form.
 *
 * There is no backend on this site yet, so nothing is transmitted: the
 * validated payload is written to the browser console and the seam answers
 * `unavailable`. The form says the form is not open yet and nothing was sent;
 * it never claims the brief was received.
 *
 * TODO(api): when the requisition endpoint exists, this is the ONLY file that
 * changes. Replace the console.log with the fetch below, keep the
 * `SubmitResult` shape, and the form picks up success and failure states with
 * no edits of its own.
 *
 *   const response = await fetch("/api/request-talent", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 *   if (!response.ok) return { ok: false, reason: "failed" };
 *   return { ok: true };
 *
 * Note that an /api route would be the first backend code in this repo. See
 * CLAUDE.md: that is a deliberate architectural decision, not a detail to
 * settle inside a form component.
 */

export type RequisitionPayload = {
  /** ISO 8601, set at submit time. */
  submittedAt: string;
  contact: {
    fullName: string;
    workEmail: string;
    phone: string;
    companyName: string;
    jobTitle: string;
  };
  role: {
    title: string;
    /** Engagement model id, e.g. "direct-hire". */
    service: string;
    /** "<area>:<sub-specialty>", e.g. "healthcare:nursing". */
    specialty: string;
    location: { city: string; state: string };
    /** "onsite" | "hybrid" | "remote". */
    workMode: string;
    positions: number;
    /** ISO date, or null when the start date is open. */
    targetStartDate: string | null;
    compensation: {
      min: number | null;
      max: number | null;
      /** "hour" | "year", or null when no range was given. */
      unit: string | null;
    };
    additionalRequirements: string;
  };
};

/**
 * `unavailable`: the form is not connected to anything, so nothing was sent.
 * The form says exactly that. When the endpoint exists, a failed request
 * returns `{ ok: false, reason: "failed" }` with copy of its own.
 */
export type SubmitResult = { ok: true } | { ok: false; reason: "unavailable" };

export async function submitRequisition(
  payload: RequisitionPayload,
): Promise<SubmitResult> {
  // Stands in for the API call sketched above.
  console.log("[request-talent] requisition payload", payload);
  return { ok: false, reason: "unavailable" };
}
