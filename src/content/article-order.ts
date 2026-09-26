/**
 * The order articles are listed in, newest first. The single source for it:
 * getArticles() in src/lib/insights.ts sorts by this list, so the /insights
 * index and the home page's latest-articles rail always agree.
 *
 * WHY A LIST AND NOT THE DATE. Every article carries the import date as its
 * datePublished (the source months were all in the future at import - see
 * scripts/import-articles.ts), so sorting by date is a thirty-way tie and
 * whatever breaks it is arbitrary. Do not go back to sorting by date until
 * the articles carry real, distinct publication dates.
 *
 * WHY A LIST AND NOT AN `order` FIELD ON THE ARTICLE. The article files are
 * generated and the next import overwrites them; a hand-set field there would
 * be lost, and teaching the importer to invent one would put an editorial
 * decision in a parser. This file is hand-owned and survives re-imports.
 *
 * WHERE THE ORDER COMES FROM. The client's documents: each article's
 * "Last updated" line names the month it is scheduled for, October 2026 to
 * March 2027. Months run newest first. Within a month the order follows that
 * month's optimization audit, which lists the pillar first; articles the
 * audit does not list follow in title order.
 *
 * `npm test` asserts that this list names every imported article exactly
 * once and nothing else, so a new import fails there until it is placed.
 */
export const articleOrder: readonly string[] = [
  // March 2027
  "healthcare-staffing-models",
  // February 2027
  "allied-health-recruitment",
  "how-to-hire-radiologic-technologists",
  "how-to-hire-respiratory-therapists",
  "non-clinical-healthcare-hiring",
  "how-to-hire-medical-billers-coders",
  "how-to-hire-medical-practice-manager",
  "choose-healthcare-recruitment-partner",
  // January 2027
  "healthcare-workforce-outlook",
  "nursing-shortage-statistics",
  "ai-in-healthcare-recruitment",
  "ai-hiring-laws",
  "healthcare-employee-turnover",
  "first-year-healthcare-turnover",
  "why-are-hospitals-short-staffed",
  // December 2026
  "healthcare-hiring-process",
  "direct-hire-vs-contract-to-hire",
  "healthcare-time-to-fill-benchmarks",
  "healthcare-hiring-trends-2027",
  "why-candidates-decline-offers",
  // November 2026
  "direct-hire-vs-travel-nurse-cost",
  "reduce-travel-nurse-reliance",
  "how-to-hire-nurses",
  "how-long-to-hire-a-nurse",
  "nurse-turnover-statistics",
  "healthcare-candidate-drop-off",
  // October 2026
  "direct-hire-healthcare-recruitment",
  "direct-hire-placement-fees",
  "direct-hire-recruitment-process",
  "what-is-direct-hire-recruitment",
];
