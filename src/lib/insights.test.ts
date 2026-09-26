/**
 * Unit tests for the insights data source.
 *
 * These run over the real imported articles, not fixtures: the properties
 * asserted here are the ones the importer promises and a page cannot show
 * as broken. A placeholder that survived, a source without a URL, a
 * cross-link to an article that does not exist, or a fixture that reached
 * getArticles() all fail here before anyone notices them on a live site.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getArticleBySlug, getArticles, sortArticles } from "./insights.ts";
import type { Article } from "./insights.ts";
import { FIXTURE_SENTINEL, fullArticle } from "./insights.fixture.ts";
import { articleOrder } from "../content/article-order.ts";

const articles = await getArticles();

/** Every string anywhere in an article, however deep. */
function everyString(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((inner) => everyString(inner, out));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((inner) => everyString(inner, out));
  }
  return out;
}

describe("getArticles", () => {
  it("returns the imported articles", () => {
    assert.ok(Array.isArray(articles));
    assert.ok(articles.length > 0);
  });

  it("returns no fixture, ever", () => {
    for (const article of articles) {
      for (const text of everyString(article)) {
        assert.equal(text.includes(FIXTURE_SENTINEL), false, article.slug);
      }
    }
  });

  it("gives every article a unique slug that is a clean URL segment", () => {
    const slugs = new Set<string>();
    for (const article of articles) {
      assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.equal(slugs.has(article.slug), false, `duplicate slug ${article.slug}`);
      slugs.add(article.slug);
    }
  });

  // Order is asserted under "articleOrder" below: by the explicit list,
  // never by datePublished, which is one import date for every article.
});

describe("getArticleBySlug", () => {
  it("finds every imported article by its slug", async () => {
    for (const article of articles) {
      assert.equal(await getArticleBySlug(article.slug), article);
    }
  });

  it("returns null for an unknown slug", async () => {
    assert.equal(await getArticleBySlug("no-such-article"), null);
  });

  it("returns null for a fixture slug", async () => {
    assert.equal(await getArticleBySlug(fullArticle.slug), null);
  });
});

describe("every imported article", () => {
  const isIsoDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

  for (const article of articles) {
    describe(article.slug, () => {
      it("carries no author field, so no byline can be invented", () => {
        assert.equal("author" in article, false);
      });

      it("has a title, meta title, meta description and summary", () => {
        for (const field of ["title", "metaTitle", "metaDescription", "summary"] as const) {
          assert.ok(article[field].trim().length > 0, field);
        }
      });

      it("has at least one key takeaway under a heading", () => {
        assert.ok(article.keyTakeaways.heading.length > 0);
        assert.ok(article.keyTakeaways.items.length > 0);
      });

      it("holds its body as structured blocks rather than an HTML string", () => {
        assert.ok(Array.isArray(article.body));
        assert.ok(article.body.length > 0);
        for (const block of article.body) {
          assert.ok(["paragraph", "heading", "list", "table"].includes(block.kind));
          if (block.kind === "heading") assert.ok(block.level === 2 || block.level === 3);
          if (block.kind === "list") {
            assert.ok(block.items.length > 0);
            for (const item of block.items) assert.ok(item.text.length > 0);
          }
          if (block.kind === "table") {
            assert.ok(block.header.length > 0);
            assert.ok(block.rows.length > 0);
            for (const row of block.rows) assert.equal(row.length, block.header.length);
          }
        }
      });

      it("never skips a heading level", () => {
        let level = 2;
        for (const block of article.body) {
          if (block.kind !== "heading") continue;
          assert.ok(block.level <= level + 1, `h${block.level} after h${level}`);
          level = block.level;
        }
      });

      it("has FAQs with a question and at least one answer paragraph each", () => {
        for (const faq of article.faqs) {
          assert.ok(faq.question.length > 0);
          assert.ok(faq.answer.length > 0);
          for (const paragraph of faq.answer) assert.ok(paragraph.text.length > 0);
        }
      });

      it("carries link marks that are in bounds, ordered, non-overlapping and resolved", () => {
        const prose = [
          ...article.body.flatMap((block) =>
            block.kind === "paragraph" ? [block] : block.kind === "list" ? block.items : [],
          ),
          ...article.faqs.flatMap((faq) => faq.answer),
        ];
        for (const rich of prose) {
          let last = 0;
          for (const mark of rich.links ?? []) {
            assert.ok(mark.start >= last, `overlapping mark in "${rich.text}"`);
            assert.ok(mark.end > mark.start, `empty mark in "${rich.text}"`);
            assert.ok(mark.end <= rich.text.length, `mark past the end of "${rich.text}"`);
            assert.ok(rich.text.slice(mark.start, mark.end).trim().length > 0);
            last = mark.end;
            if (mark.href.startsWith("/insights/")) {
              const slug = mark.href.slice("/insights/".length);
              assert.ok(articles.some((other) => other.slug === slug), `link to missing ${slug}`);
            } else {
              assert.match(mark.href, /^(\/[a-z0-9/#-]*|https:\/\/[^\s]+)$/);
            }
          }
        }
      });

      it("cites at least one source, every one an absolute https URL", () => {
        assert.ok(article.sources.length > 0);
        for (const source of article.sources) {
          assert.ok(source.name.length > 0);
          assert.match(source.url, /^https:\/\/[^\s/]+/);
          assert.doesNotThrow(() => new URL(source.url));
        }
      });

      it("relates only to articles that exist, and not to itself", () => {
        for (const slug of article.related) {
          assert.notEqual(slug, article.slug);
          assert.ok(articles.some((other) => other.slug === slug), slug);
        }
      });

      it("carries ISO dates, modified no earlier than published, and neither in the future", () => {
        assert.ok(isIsoDate(article.datePublished));
        assert.ok(isIsoDate(article.dateModified));
        assert.ok(article.dateModified >= article.datePublished);
        const today = new Date().toISOString().slice(0, 10);
        assert.ok(article.datePublished <= today, `${article.datePublished} is in the future`);
      });

      it("contains no bracketed placeholder, no internal note and no capital-R brand", () => {
        for (const text of everyString(article)) {
          assert.doesNotMatch(text, /\[[A-Z]/, text);
          assert.doesNotMatch(text, /not for publication/i, text);
          assert.doesNotMatch(text, /TalentRax/, text);
        }
      });
    });
  }
});

describe("sortArticles", () => {
  it("does not mutate its input and follows the explicit order", () => {
    const first: Article = { ...fullArticle, slug: "a", datePublished: "2026-01-01" };
    const second: Article = { ...fullArticle, slug: "b", datePublished: "2026-02-01" };
    const input = [second, first];
    // The later date sorts second: the list decides, not datePublished.
    const sorted = sortArticles(input, ["a", "b"]);
    assert.deepEqual(sorted.map((a) => a.slug), ["a", "b"]);
    assert.deepEqual(input.map((a) => a.slug), ["b", "a"]);
  });

  it("puts unlisted slugs last, by title", () => {
    const listed = { ...fullArticle, slug: "listed", title: "Zulu" };
    const b = { ...fullArticle, slug: "b", title: "Beta" };
    const a = { ...fullArticle, slug: "a", title: "Alpha" };
    assert.deepEqual(
      sortArticles([b, listed, a], ["listed"]).map((x) => x.slug),
      ["listed", "a", "b"],
    );
  });
});

describe("articleOrder", () => {
  it("names every imported article exactly once, and nothing else", () => {
    assert.equal(new Set(articleOrder).size, articleOrder.length, "duplicate slug");
    assert.deepEqual(
      [...articleOrder].sort(),
      articles.map((a) => a.slug).sort(),
    );
  });

  it("is the order getArticles() returns", () => {
    assert.deepEqual(articles.map((a) => a.slug), [...articleOrder]);
  });
});
