/**
 * Unit tests for the forms gate's rule (decideFormsOpen).
 *
 * The gate fails silently in both directions: closed, a real visitor is told
 * the form is not open; open too early, production takes real submissions
 * before anyone reads them or the privacy policy says where they go. So
 * every branch is pinned, and production most of all.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decideFormsOpen } from "./env.ts";

const LOCAL = "http://127.0.0.1:54321";
const HOSTED = "https://abcdefghijklmnop.supabase.co";
const KEY = "sb_publishable_example";

describe("decideFormsOpen", () => {
  it("is closed with no database configured, in every environment", () => {
    for (const appEnv of ["local", "staging", "production"] as const) {
      for (const [url, publishableKey] of [
        [undefined, undefined],
        [LOCAL, undefined],
        [undefined, KEY],
        ["", ""],
      ]) {
        assert.equal(decideFormsOpen({ appEnv, url, publishableKey, productionReleased: true }), false);
      }
    }
  });

  it("is open locally against the local stack", () => {
    assert.equal(decideFormsOpen({ appEnv: "local", url: LOCAL, publishableKey: KEY, productionReleased: false }), true);
    assert.equal(
      decideFormsOpen({ appEnv: "local", url: "http://localhost:54321", publishableKey: KEY, productionReleased: false }),
      true,
    );
  });

  it("is closed locally against a hosted project: a deploy that forgot APP_ENV takes nothing", () => {
    assert.equal(decideFormsOpen({ appEnv: "local", url: HOSTED, publishableKey: KEY, productionReleased: true }), false);
  });

  it("is open on staging, which does not wait on the release conditions", () => {
    assert.equal(decideFormsOpen({ appEnv: "staging", url: HOSTED, publishableKey: KEY, productionReleased: false }), true);
  });

  it("is open in production only once released", () => {
    assert.equal(decideFormsOpen({ appEnv: "production", url: HOSTED, publishableKey: KEY, productionReleased: false }), false);
    assert.equal(decideFormsOpen({ appEnv: "production", url: HOSTED, publishableKey: KEY, productionReleased: true }), true);
  });
});
