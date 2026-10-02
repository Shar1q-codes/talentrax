/**
 * Wording shared by every wired public form's outcomes.
 *
 * When to try again after a 429, from the seconds the database gave
 * (migration 12). A wait, not a figure about the business: it is the one
 * number a form may show. It never says which limit was hit.
 */
export function retryIn(seconds: number | null): string {
  if (seconds === null) return "Please try again later.";
  const minutes = Math.ceil(seconds / 60);
  if (minutes <= 1) return "Please try again in a minute.";
  return `Please try again in about ${minutes} minutes.`;
}
