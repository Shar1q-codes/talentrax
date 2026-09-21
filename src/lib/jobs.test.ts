/**
 * Unit tests for the job data source.
 *
 * The first test is the important one: the board ships with zero jobs, and if
 * a fixture ever finds its way into getJobs() this fails before anyone
 * notices invented postings on a live staffing site.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getJobBySlug, getJobs, getRecentlyExpiredSlugs, isExpired } from "./jobs.ts";
import { onsiteSalariedJob } from "./jobs.fixture.ts";

describe("getJobs", () => {
  it("returns no jobs, because there are none", async () => {
    assert.deepEqual(await getJobs(), []);
  });

  it("returns an array, so the board can map over it unguarded", async () => {
    assert.ok(Array.isArray(await getJobs()));
  });
});

describe("getJobBySlug", () => {
  it("returns null for any slug while the board is empty", async () => {
    assert.equal(await getJobBySlug("anything-at-all"), null);
  });
});

describe("getRecentlyExpiredSlugs", () => {
  it("returns nothing, because nothing has been published to expire", async () => {
    assert.deepEqual(await getRecentlyExpiredSlugs(), []);
  });
});

describe("isExpired", () => {
  // validThrough is "2026-12-01".
  const job = onsiteSalariedJob;

  it("is live well before the expiry date", () => {
    assert.equal(isExpired(job, new Date("2026-11-01T12:00:00Z")), false);
  });

  it("is live for the whole of the expiry date itself", () => {
    assert.equal(isExpired(job, new Date("2026-12-01T00:00:00Z")), false);
    assert.equal(isExpired(job, new Date("2026-12-01T23:59:59Z")), false);
  });

  it("is expired once the day after starts", () => {
    assert.equal(isExpired(job, new Date("2026-12-02T00:00:00Z")), true);
  });

  it("is expired long afterwards", () => {
    assert.equal(isExpired(job, new Date("2027-06-01T00:00:00Z")), true);
  });

  it("treats an unparseable date as live, so the fault gets noticed", () => {
    const broken = { ...job, validThrough: "not-a-date" };
    assert.equal(isExpired(broken, new Date("2030-01-01T00:00:00Z")), false);
  });
});
