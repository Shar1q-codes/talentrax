/**
 * ============================================================================
 *  TEST FIXTURES ONLY. THIS FILE MUST NEVER BE IMPORTED BY A PAGE, A LAYOUT,
 *  A COMPONENT, OR ANYTHING ELSE THAT REACHES THE BUILD OUTPUT.
 * ============================================================================
 *
 * These are not real jobs and never were. A fabricated JobPosting on a live
 * staffing site is not a harmless placeholder: with structured data attached
 * it can get the whole domain removed from Google for Jobs, and a candidate
 * who applies to one has been lied to.
 *
 * Every fixture therefore carries FIXTURE_SENTINEL in its id and slug. The
 * point is not decoration - it is so a single grep over the build output
 * proves nothing leaked:
 *
 *   npm run build
 *   grep -r "DO-NOT-SHIP-FIXTURE" .next    # must print nothing
 *
 * That check runs as part of the verification for this section. If it ever
 * prints something, a fixture has been imported into the app and the job
 * board is publishing invented postings.
 *
 * Nothing imports this file except *.test.ts, which Next never bundles
 * because no route reaches them.
 */

import type { Job } from "./jobs.ts";

/** Greppable marker. Present in every fixture id and slug. */
export const FIXTURE_SENTINEL = "DO-NOT-SHIP-FIXTURE";

/**
 * An onsite, salaried, healthcare posting. The ordinary case: every required
 * field populated, nothing unusual.
 */
export const onsiteSalariedJob: Job = {
  id: `${FIXTURE_SENTINEL}-0001`,
  slug: `${FIXTURE_SENTINEL}-med-surg-rn`,
  title: "Fixture Med-Surg Nurse",
  deskId: "healthcare",
  specialtyId: "nursing",
  engagementId: "direct-hire",
  location: { city: "Columbus", state: "OH", workMode: "onsite" },
  pay: { min: 72000, max: 88000, unit: "year", currency: "USD" },
  datePosted: "2026-09-01",
  validThrough: "2026-12-01",
  description: [
    "First fixture paragraph.",
    "Second fixture paragraph, so the join is worth testing.",
  ],
  responsibilities: ["Fixture responsibility."],
  requirements: ["Fixture requirement."],
};

/**
 * A remote hourly contract posting. Exercises the branch Google treats
 * differently: TELECOMMUTE plus applicantLocationRequirements, and an hourly
 * rather than annual rate.
 */
export const remoteHourlyJob: Job = {
  id: `${FIXTURE_SENTINEL}-0002`,
  slug: `${FIXTURE_SENTINEL}-platform-engineer`,
  title: "Fixture Platform Engineer",
  deskId: "technology",
  specialtyId: "cloud",
  engagementId: "contract",
  location: { city: "Austin", state: "TX", workMode: "remote" },
  pay: { min: 85, max: 110, unit: "hour", currency: "USD" },
  datePosted: "2026-09-10",
  validThrough: "2026-10-10",
  description: ["Only one fixture paragraph here."],
  responsibilities: [],
  requirements: [],
};

/** An engagement id the employmentType map does not know about. */
export const unknownEngagementJob: Job = {
  ...onsiteSalariedJob,
  id: `${FIXTURE_SENTINEL}-0003`,
  slug: `${FIXTURE_SENTINEL}-unknown-engagement`,
  engagementId: "some-model-invented-after-this-was-written",
};

export const fixtureOrganization = {
  name: "Fixture Org",
  siteUrl: "https://fixture.example.com",
};
