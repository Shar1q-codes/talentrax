/**
 * Unit tests for reading a public form's insert response.
 *
 * The 429 is the case a mistake hides in: a wait read from the wrong place
 * shows a visitor nothing, or a wrong number.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toIntakeResult } from "./intake-result.ts";

// The SDK's error type, by way of the function: tests may not import the SDK.
type PostgrestError = NonNullable<Parameters<typeof toIntakeResult>[0]["error"]>;

function error(fields: Partial<PostgrestError>): PostgrestError {
  return { name: "PostgrestError", message: "", details: "", hint: "", code: "", ...fields } as PostgrestError;
}

// What migration 12 sends, as supabase-js hands it over.
const rateLimited = error({
  code: "rate_limited",
  message: "Too many submissions. Please wait and try again.",
  details: "3599",
});

describe("toIntakeResult", () => {
  it("is ok when there is no error: a stored row, a retry and a held row all look the same", () => {
    assert.deepEqual(toIntakeResult({ error: null, status: 201 }), { ok: true });
  });

  it("reads a 429's wait from details, where a cross-origin page can see it", () => {
    assert.deepEqual(toIntakeResult({ error: rateLimited, status: 429 }), {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: 3599,
    });
  });

  it("still knows a 429 with no readable wait, and says so with null", () => {
    for (const details of ["", "soon", "0", "-5"]) {
      assert.deepEqual(toIntakeResult({ error: error({ code: "rate_limited", details }), status: 429 }), {
        ok: false,
        reason: "rate_limited",
        retryAfterSeconds: null,
      });
    }
  });

  it("calls anything else a failure: a refused insert, an outage, no network", () => {
    for (const [fields, status] of [
      [{ code: "23514", message: "violates check constraint" }, 400],
      [{ code: "42501", message: "permission denied" }, 401],
      [{ code: "", message: "TypeError: Failed to fetch" }, 0],
      [{ code: "PGRST000" }, 503],
    ] as const) {
      assert.deepEqual(toIntakeResult({ error: error(fields), status }), { ok: false, reason: "failed" });
    }
  });
});
