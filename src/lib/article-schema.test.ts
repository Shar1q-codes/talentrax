/**
 * Unit tests for the BlogPosting structured data.
 *
 * Same reasoning as job-posting-schema.test.ts: JSON-LD fails silently. A
 * missing dateModified or a malformed mainEntityOfPage does not throw and
 * does not show up in review - the article simply never earns a rich result.
 *
 * Fixtures come from insights.fixture.ts, which no page imports.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { articleUrl, blogPostingJsonLd } from "./article-schema.ts";
import {
  fixturePublisher,
  fullArticle,
  unmodifiedArticle,
} from "./insights.fixture.ts";

const payload = blogPostingJsonLd(fullArticle, fixturePublisher);
const unmodified = blogPostingJsonLd(unmodifiedArticle, fixturePublisher);

describe("blogPostingJsonLd", () => {
  it("declares itself as schema.org BlogPosting", () => {
    assert.equal(payload["@context"], "https://schema.org");
    assert.equal(payload["@type"], "BlogPosting");
  });

  it("carries every field the generator promises", () => {
    for (const field of [
      "headline",
      "description",
      "datePublished",
      "dateModified",
      "mainEntityOfPage",
      "publisher",
      "url",
    ]) {
      assert.ok(
        payload[field] !== undefined && payload[field] !== null,
        `field "${field}" is missing`,
      );
    }
  });

  it("takes the headline from the title and the description from the standfirst", () => {
    assert.equal(payload.headline, fullArticle.title);
    assert.equal(payload.description, fullArticle.standfirst);
  });

  it("passes both dates through as ISO dates", () => {
    assert.equal(payload.datePublished, "2026-09-01");
    assert.equal(payload.dateModified, "2026-09-14");
    assert.ok(!Number.isNaN(Date.parse(String(payload.datePublished))));
    assert.ok(!Number.isNaN(Date.parse(String(payload.dateModified))));
  });

  it("reports an unedited article as modified on its publication date", () => {
    assert.equal(unmodified.datePublished, unmodified.dateModified);
  });

  it("points mainEntityOfPage at the article's own canonical URL", () => {
    assert.deepEqual(payload.mainEntityOfPage, {
      "@type": "WebPage",
      "@id": `https://fixture.example.com/insights/${fullArticle.slug}`,
    });
    assert.equal(payload.url, payload.mainEntityOfPage["@id" as never]);
  });

  it("names the publisher from the organisation passed in", () => {
    assert.deepEqual(payload.publisher, {
      "@type": "Organization",
      name: "Fixture Org",
      url: "https://fixture.example.com",
    });
  });

  it("emits no author, because the Article type has none", () => {
    assert.equal(payload.author, undefined);
    assert.equal(JSON.stringify(payload).includes("author"), false);
  });

  it("serialises to JSON without throwing or losing a field", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  });
});

describe("articleUrl", () => {
  it("joins the origin and the slug under /insights", () => {
    assert.equal(
      articleUrl("https://example.com", "a-slug"),
      "https://example.com/insights/a-slug",
    );
  });
});
