/**
 * Tests for the sentence-list joiner.
 *
 * Small, but it has one real rule in it - the serial comma - and the case it
 * exists for ("Sales and marketing and Trades") is the kind of thing that
 * reads fine to whoever wrote it and badly to everyone else.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deskNamesSentence,
  subSpecialtyNamesSentence,
  toSentenceList,
} from "./taxonomy.ts";

describe("toSentenceList", () => {
  it("returns a single item unchanged", () => {
    assert.equal(toSentenceList(["Healthcare"]), "Healthcare");
  });

  it("returns nothing for an empty list", () => {
    assert.equal(toSentenceList([]), "");
  });

  it("joins two items with a plain conjunction", () => {
    assert.equal(toSentenceList(["A", "B"]), "A and B");
  });

  it("joins three simple items without a serial comma", () => {
    assert.equal(toSentenceList(["A", "B", "C"]), "A, B and C");
  });

  it("takes a serial comma when an item contains its own 'and'", () => {
    assert.equal(
      toSentenceList(["Accounting and finance", "Human resources", "Trades"]),
      "Accounting and finance, Human resources, and Trades",
    );
  });

  it("takes a serial comma when the LAST item contains 'and'", () => {
    assert.equal(
      toSentenceList(["Cloud", "DevOps", "Research and insight"]),
      "Cloud, DevOps, and Research and insight",
    );
  });

  it("does not add one for a hyphenated or standalone 'and' inside a word", () => {
    // "Brand" contains "and" but not " and ".
    assert.equal(toSentenceList(["Brand", "Design", "Copy"]), "Brand, Design and Copy");
  });
});

describe("the taxonomy sentences it builds", () => {
  it("reads cleanly for the desks, which have no internal conjunction", () => {
    assert.equal(deskNamesSentence(), "Healthcare, Technology and Professional");
  });

  it("reads cleanly for the Professional desk, which has two", () => {
    assert.equal(
      subSpecialtyNamesSentence("professional"),
      "Accounting and finance, Human resources, Administrative, Sales and marketing, and Trades",
    );
  });
});
