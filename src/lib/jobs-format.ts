/**
 * Presentation helpers for job data.
 *
 * Locales are pinned to en-US rather than left to the runtime. Every page
 * here is statically prerendered and then hydrated in a browser that may
 * disagree with the build machine about how to format a number or a date;
 * pinning it keeps the server HTML and the client render identical.
 *
 * No value imports, so the unit tests can reach this the same way they reach
 * jobs.ts.
 */

import type { Job, PayRange } from "./jobs";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const postedDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * "$72,000 - $88,000 a year".
 *
 * `unitLabel` is passed in because it is copy, and copy lives in
 * content/jobs.ts. The currency code on the range is honoured for the symbol
 * only when it is USD; anything else falls back to printing the code, which
 * is wrong-looking enough to get noticed rather than silently mislabelling
 * a foreign currency as dollars.
 */
export function formatPayRange(pay: PayRange, unitLabel: string): string {
  const format = (value: number) =>
    pay.currency === "USD"
      ? money.format(value)
      : `${value.toLocaleString("en-US")} ${pay.currency}`;

  return `${format(pay.min)} - ${format(pay.max)} ${unitLabel}`;
}

/** "September 21, 2026". Takes the ISO date string straight from the job. */
export function formatPostedDate(isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed)) return isoDate;
  return postedDate.format(new Date(parsed));
}

/** "Columbus, OH" - the human-readable location line. */
export function formatLocation(location: Job["location"]): string {
  return `${location.city}, ${location.state}`;
}
