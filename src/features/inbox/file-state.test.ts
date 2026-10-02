/**
 * Unit tests for a resume's file state in the inbox.
 *
 * The state decides whether a download is offered, so getting it wrong
 * either hides a good resume or offers one that failed verification.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fileStateOf } from "./file-state.ts";

const row = (fields: Partial<Parameters<typeof fileStateOf>[0]>) => ({
  resume_storage_path: null,
  resume_received_at: null,
  resume_rejected_at: null,
  resume_rejected_reason: null,
  ...fields,
});

describe("fileStateOf", () => {
  it("received only when checked and kept", () => {
    assert.equal(fileStateOf(row({ resume_storage_path: "a/b.pdf", resume_received_at: "2026-10-02" })), "received");
  });

  it("refused for every failed check, never_arrived for one that lapsed", () => {
    for (const reason of ["signature_mismatch", "size_mismatch", "type_mismatch"]) {
      assert.equal(
        fileStateOf(row({ resume_storage_path: "a/b.pdf", resume_rejected_at: "2026-10-02", resume_rejected_reason: reason })),
        "refused",
      );
    }
    assert.equal(
      fileStateOf(row({ resume_storage_path: "a/b.pdf", resume_rejected_at: "2026-10-02", resume_rejected_reason: "not_received" })),
      "never_arrived",
    );
  });

  it("not_checked with a path and no verdict, none with no path", () => {
    assert.equal(fileStateOf(row({ resume_storage_path: "a/b.pdf" })), "not_checked");
    assert.equal(fileStateOf(row({})), "none");
  });
});
