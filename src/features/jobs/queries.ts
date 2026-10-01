/**
 * The job board's data source.
 *
 * THERE ARE NO JOBS. `getJobs()` returns an empty array, and that is the
 * honest state of this business's board today. Nothing in this file, and
 * nothing that reaches the build output, contains a sample, example or
 * illustrative posting. A fabricated JobPosting with structured data is not a
 * harmless placeholder: Google can remove the whole domain from Google for
 * Jobs over one, and that is not a recoverable mistake on a staffing site.
 *
 * Test fixtures live in jobs.fixture.ts, which no page imports. See the
 * header of that file.
 *
 * NO VALUE IMPORTS HERE, on purpose. Everything below is pure and dependency
 * free so the unit tests can import it directly under `node --test` without
 * a path-alias resolver or a bundler. The type import is erased at runtime.
 */

/** Matches the ids in content/taxonomy.ts. */
export type DeskId = string;
export type SpecialtyId = string;
export type EngagementId = string;

export type WorkMode = "onsite" | "hybrid" | "remote";

export type PayUnit = "hour" | "year";

/**
 * A posted pay range.
 *
 * REQUIRED on every job, and required by the TYPE rather than by discipline.
 * Several states mandate a range in the posting, the whole positioning of
 * this site is that every role shows one, and "we forgot on that one" is not
 * a defence in either conversation. A job without a range cannot be
 * constructed.
 */
export type PayRange = {
  min: number;
  max: number;
  unit: PayUnit;
  /** ISO 4217. "USD" for every US posting. */
  currency: string;
};

export type JobLocation = {
  city: string;
  /** Two-letter USPS code, matching the state list in content/request-talent.ts. */
  state: string;
  workMode: WorkMode;
};

export type Job = {
  /** Stable id from the source system. */
  id: string;
  /** URL segment. Must be unique and must not change once published. */
  slug: string;
  title: string;
  /** Desk id from content/taxonomy.ts, e.g. "healthcare". */
  deskId: DeskId;
  /** Sub-specialty id within that desk, e.g. "nursing". */
  specialtyId: SpecialtyId;
  /** Engagement model id from content/taxonomy.ts, e.g. "direct-hire". */
  engagementId: EngagementId;
  location: JobLocation;
  /** Never optional. See PayRange. */
  pay: PayRange;
  /** ISO 8601 date, e.g. "2026-09-21". */
  datePosted: string;
  /**
   * ISO 8601 date the posting stops being valid. Required: a posting with no
   * expiry never leaves the index and eventually becomes a lie. Past this
   * date the URL must return 410 Gone - see isExpired and CLAUDE.md.
   */
  validThrough: string;
  /** Paragraphs of plain text. Rendered as <p>, joined for JSON-LD. */
  description: string[];
  responsibilities: string[];
  requirements: string[];
};

/**
 * Every live posting.
 *
 * TODO(api): replace the empty array with the board fetch. The endpoint
 * returns live postings only - anything past validThrough must not appear
 * here, or it goes straight back into the index the day after it expires.
 *
 *   const response = await fetch(`${process.env.JOBS_API_URL}/jobs`, {
 *     headers: { Accept: "application/json" },
 *     // Revalidate rather than cache forever: a board is stale within hours.
 *     next: { revalidate: 300 },
 *   });
 *   if (!response.ok) return [];   // an empty board beats a broken page
 *   const payload: unknown = await response.json();
 *   return parseJobs(payload);     // validate; never trust the shape
 *
 * Whatever lands here must satisfy the Job type above, including pay. If the
 * upstream system can return a posting without a range, the mapping layer
 * decides what to do about it - drop it, or fail the build - rather than
 * making `pay` optional and letting a rangeless job reach the page.
 *
 * An empty array is a valid, expected answer, and the board renders a real
 * empty state for it. It is never a reason to invent a posting.
 */
export async function getJobs(): Promise<Job[]> {
  return [];
}

/** One posting by slug, or null. Null means 404; expired means 410. */
export async function getJobBySlug(slug: string): Promise<Job | null> {
  const jobs = await getJobs();
  return jobs.find((job) => job.slug === slug) ?? null;
}

/**
 * True once `validThrough` has passed.
 *
 * Compared as calendar dates in UTC, not timestamps: `validThrough` is a
 * date, and a posting that expires "on the 30th" should still be live for
 * all of the 30th wherever the reader is.
 */
export function isExpired(job: Job, now: Date = new Date()): boolean {
  const expiry = Date.parse(`${job.validThrough}T23:59:59.999Z`);
  if (Number.isNaN(expiry)) {
    // An unparseable date is a data fault, not an expiry. Treat the posting
    // as live and let it be visible enough to get noticed and fixed.
    return false;
  }
  return now.getTime() > expiry;
}

/**
 * Slugs that were published and have since expired.
 *
 * These are what the 410 layer needs: `getJobs()` no longer returns them, so
 * without this list an expired URL would 404, and a 404 is a weaker removal
 * signal than a 410 for a posting that is genuinely gone for good.
 *
 * TODO(api): fetch from the same source as getJobs(), asking for postings
 * that expired within the retention window the ATS keeps. Returning them
 * forever is not necessary - once the URL has dropped out of the index, a
 * 404 is fine.
 *
 * See CLAUDE.md, "Expired job postings", for where the 410 is actually
 * served. It cannot be a page component: Next has no way to set a status
 * code from one.
 */
export async function getRecentlyExpiredSlugs(): Promise<string[]> {
  return [];
}
