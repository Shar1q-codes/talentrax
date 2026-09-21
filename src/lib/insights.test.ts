/**
 * Unit tests for the insights data source.
 *
 * The first test is the one that matters: the index ships with zero articles,
 * and if a fixture ever reaches getArticles() this fails before anyone
 * notices invented editorial on a live site.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getArticleBySlug, getArticles } from "./insights.ts";
import { fullArticle } from "./insights.fixture.ts";

describe("getArticles", () => {
  it("returns no articles, because none are published", async () => {
    assert.deepEqual(await getArticles(), []);
  });

  it("returns an array, so the index can map over it unguarded", async () => {
    assert.ok(Array.isArray(await getArticles()));
  });
});

describe("getArticleBySlug", () => {
  it("returns null for any slug while nothing is published", async () => {
    assert.equal(await getArticleBySlug("anything-at-all"), null);
  });

  it("returns null even for a fixture slug", async () => {
    assert.equal(await getArticleBySlug(fullArticle.slug), null);
  });
});

describe("the Article type", () => {
  it("carries no author field, so no byline can be invented", () => {
    assert.equal("author" in fullArticle, false);
  });

  it("holds its body as structured blocks rather than an HTML string", () => {
    assert.ok(Array.isArray(fullArticle.body));
    for (const block of fullArticle.body) {
      assert.ok(["paragraph", "heading", "list"].includes(block.kind));
    }
  });
});
