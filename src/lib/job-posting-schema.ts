/**
 * schema.org JobPosting generator.
 *
 * This is the file on this project most worth getting right. Structured data
 * is what puts a posting into Google for Jobs, and it fails silently: a
 * malformed or dishonest payload does not throw, it just quietly does not
 * appear, or gets the domain removed. Hence job-posting-schema.test.ts.
 *
 * It is a pure function of its arguments. The hiring organisation is passed
 * in rather than imported from content/site.ts, which keeps this module free
 * of value imports so the tests can run it directly under `node --test`, and
 * keeps the generator honest about what it depends on.
 *
 * Reference: https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */

import type { Job } from "./jobs";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JobPostingJsonLd = Record<string, JsonLdValue>;

/**
 * Always Talentrax Global, never a client. A posting on this board is
 * published by the agency, and the Job type carries no employer or client
 * field on purpose - see "The job board" in CLAUDE.md.
 */
export type HiringOrganization = {
  name: string;
  /** Absolute origin, no trailing slash. */
  siteUrl: string;
};

/**
 * schema.org employmentType, keyed by the engagement model ids in
 * content/taxonomy.ts.
 *
 * Unknown ids fall back to "OTHER" rather than throwing. A new engagement
 * model should not be able to take the whole board down at build time, and
 * "OTHER" is a true statement about a posting we have no better word for.
 * The test pins both the mapping and the fallback.
 */
const EMPLOYMENT_TYPE: Record<string, string> = {
  "direct-hire": "FULL_TIME",
  contract: "CONTRACTOR",
  "executive-search": "FULL_TIME",
};

export function employmentTypeFor(engagementId: string): string {
  return EMPLOYMENT_TYPE[engagementId] ?? "OTHER";
}

/** schema.org unitText for a pay range. */
function unitTextFor(unit: Job["pay"]["unit"]): string {
  return unit === "hour" ? "HOUR" : "YEAR";
}

/**
 * Builds the JobPosting payload for one job.
 *
 * Every field Google treats as required is present and derived from the job:
 * title, description, datePosted, validThrough, hiringOrganization and
 * jobLocation. baseSalary is not required by Google but is by us - see the
 * PayRange type.
 *
 * A fully remote role gets `jobLocationType: "TELECOMMUTE"` and
 * `applicantLocationRequirements` alongside `jobLocation`, which is how
 * Google wants remote postings described. Leaving those off makes a remote
 * role look location-bound; leaving `jobLocation` off loses the market.
 */
export function jobPostingJsonLd(
  job: Job,
  organization: HiringOrganization,
): JobPostingJsonLd {
  const payload: JobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description.join("\n\n"),
    identifier: {
      "@type": "PropertyValue",
      name: organization.name,
      value: job.id,
    },
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: employmentTypeFor(job.engagementId),
    hiringOrganization: {
      "@type": "Organization",
      name: organization.name,
      sameAs: organization.siteUrl,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.city,
        addressRegion: job.location.state,
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: job.pay.currency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.pay.min,
        maxValue: job.pay.max,
        unitText: unitTextFor(job.pay.unit),
      },
    },
    url: `${organization.siteUrl}/jobs/${job.slug}`,
  };

  if (job.location.workMode === "remote") {
    payload.jobLocationType = "TELECOMMUTE";
    payload.applicantLocationRequirements = {
      "@type": "Country",
      name: "USA",
    };
  }

  return payload;
}
