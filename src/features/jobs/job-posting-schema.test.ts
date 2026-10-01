/**
 * Unit tests for the JobPosting structured data.
 *
 * Run with `npm test`. Node's built-in runner executes TypeScript directly,
 * so there is no test framework, no transform step and no new dependency.
 *
 * Why this file exists when nothing else here is unit tested: JSON-LD fails
 * silently. A missing validThrough or a malformed baseSalary does not throw
 * and does not show up in review - the posting simply never appears in Google
 * for Jobs, or the domain gets pulled. Nothing else on this site has that
 * property, so nothing else needs this.
 *
 * Fixtures come from jobs.fixture.ts, which no page imports. See its header.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  employmentTypeFor,
  jobPostingJsonLd,
} from "./job-posting-schema.ts";
import {
  fixtureOrganization,
  onsiteSalariedJob,
  remoteHourlyJob,
  unknownEngagementJob,
} from "./jobs.fixture.ts";

const onsite = jobPostingJsonLd(onsiteSalariedJob, fixtureOrganization);
const remote = jobPostingJsonLd(remoteHourlyJob, fixtureOrganization);

describe("jobPostingJsonLd", () => {
  it("declares itself as schema.org JobPosting", () => {
    assert.equal(onsite["@context"], "https://schema.org");
    assert.equal(onsite["@type"], "JobPosting");
  });

  it("carries every field Google treats as required", () => {
    for (const field of [
      "title",
      "description",
      "datePosted",
      "validThrough",
      "hiringOrganization",
      "jobLocation",
    ]) {
      assert.ok(
        onsite[field] !== undefined && onsite[field] !== null,
        `required field "${field}" is missing`,
      );
    }
  });

  it("takes the title from the job", () => {
    assert.equal(onsite.title, onsiteSalariedJob.title);
  });

  it("joins description paragraphs rather than dropping all but the first", () => {
    assert.equal(
      onsite.description,
      "First fixture paragraph.\n\nSecond fixture paragraph, so the join is worth testing.",
    );
    // A single paragraph must not gain separators.
    assert.equal(remote.description, "Only one fixture paragraph here.");
  });

  it("passes the dates through as ISO dates", () => {
    assert.equal(onsite.datePosted, "2026-09-01");
    assert.equal(onsite.validThrough, "2026-12-01");
    // An expiry that does not parse is worse than no posting at all.
    assert.ok(!Number.isNaN(Date.parse(String(onsite.validThrough))));
  });

  it("identifies the posting by its source id", () => {
    assert.deepEqual(onsite.identifier, {
      "@type": "PropertyValue",
      name: fixtureOrganization.name,
      value: onsiteSalariedJob.id,
    });
  });

  it("names the hiring organisation and links it to the site", () => {
    assert.deepEqual(onsite.hiringOrganization, {
      "@type": "Organization",
      name: "Fixture Org",
      sameAs: "https://fixture.example.com",
    });
  });

  it("builds a postal address from the job location", () => {
    assert.deepEqual(onsite.jobLocation, {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Columbus",
        addressRegion: "OH",
        addressCountry: "US",
      },
    });
  });

  it("builds the absolute canonical URL for the posting", () => {
    assert.equal(
      onsite.url,
      `https://fixture.example.com/jobs/${onsiteSalariedJob.slug}`,
    );
  });

  describe("baseSalary", () => {
    it("publishes an annual range as a MonetaryAmount with unitText YEAR", () => {
      assert.deepEqual(onsite.baseSalary, {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: {
          "@type": "QuantitativeValue",
          minValue: 72000,
          maxValue: 88000,
          unitText: "YEAR",
        },
      });
    });

    it("publishes an hourly range with unitText HOUR", () => {
      const value = (remote.baseSalary as Record<string, JsonValue>)
        .value as Record<string, unknown>;
      assert.equal(value.unitText, "HOUR");
      assert.equal(value.minValue, 85);
      assert.equal(value.maxValue, 110);
    });

    it("is always present, because the Job type makes pay required", () => {
      assert.ok(onsite.baseSalary);
      assert.ok(remote.baseSalary);
    });
  });

  describe("remote postings", () => {
    it("marks a remote role as TELECOMMUTE with a location requirement", () => {
      assert.equal(remote.jobLocationType, "TELECOMMUTE");
      assert.deepEqual(remote.applicantLocationRequirements, {
        "@type": "Country",
        name: "USA",
      });
    });

    it("still carries jobLocation, so the market is not lost", () => {
      assert.ok(remote.jobLocation);
    });

    it("leaves both off an onsite role", () => {
      assert.equal(onsite.jobLocationType, undefined);
      assert.equal(onsite.applicantLocationRequirements, undefined);
    });
  });

  it("serialises to JSON without throwing or losing a field", () => {
    const round = JSON.parse(JSON.stringify(onsite));
    assert.deepEqual(round, onsite);
  });
});

describe("employmentTypeFor", () => {
  it("maps the engagement models to schema.org values", () => {
    assert.equal(employmentTypeFor("direct-hire"), "FULL_TIME");
    assert.equal(employmentTypeFor("contract"), "CONTRACTOR");
    assert.equal(employmentTypeFor("executive-search"), "FULL_TIME");
  });

  it("falls back to OTHER rather than throwing on an unknown model", () => {
    assert.equal(employmentTypeFor("not-a-model"), "OTHER");
    const payload = jobPostingJsonLd(unknownEngagementJob, fixtureOrganization);
    assert.equal(payload.employmentType, "OTHER");
  });
});

/** Local alias so the cast above reads clearly. */
type JsonValue = unknown;
