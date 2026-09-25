/**
 * The insights data source.
 *
 * Every article here was imported from the client's own documents by
 * scripts/import-articles.ts into src/content/articles/. Nothing in this
 * file, and nothing that reaches the build output, contains a sample,
 * example or placeholder article. The home page shipped three invented
 * article cards once; they were fabricated content on the most-indexed page
 * on the site and had to be torn out. An article is either imported from a
 * source document or it does not exist.
 *
 * Test fixtures live in insights.fixture.ts, which no page imports.
 *
 * NO AUTHOR FIELD, deliberately. Nobody has been named anywhere on this site
 * and a byline field is an invitation to invent one. The source documents
 * carry a bracketed byline placeholder; the importer drops it. If real
 * authorship is needed later that is a decision to take on purpose, not a
 * property that was already sitting there.
 *
 * THE STATISTICS IN THESE ARTICLES ARE CITED THIRD-PARTY DATA and are
 * preserved exactly, with their attribution. The site-wide no-statistics
 * rule bans invented claims about Talentrax's own performance, not BLS,
 * HRSA or NSI figures with a source attached. See CLAUDE.md, "Content
 * rules". Every article carries its sources as visible links.
 *
 * The only value import is the generated index, by relative path with its
 * extension, so the unit tests can load this module directly under
 * `node --test` without a path-alias resolver.
 */

import { articles as importedArticles } from "../content/articles/index.ts";

/**
 * A body block. Structured, not a raw HTML string: a CMS swap stays a mapping
 * exercise rather than a rewrite, and nothing downstream is ever handed
 * untrusted markup to render.
 *
 * There is deliberately no "quote" block. A pull quote from a named person is
 * a testimonial with better typography, and the content rules forbid those.
 */
export type ArticleBlock =
  | ({ kind: "paragraph" } & RichText)
  /**
   * Rendered as an h2 or h3 inside the article body, under the title. The
   * source documents use two heading levels; nothing skips one.
   */
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: RichText[] }
  /**
   * A data table, header row first. Cells are plain text. The comparison
   * and statistics tables are where most of the cited figures live, so
   * this block exists rather than flattening them into prose.
   */
  | { kind: "table"; header: string[]; rows: string[][] };

/**
 * An inline link, as a mark on prose: `text.slice(start, end)` is the link
 * text. Marks are sorted and never overlap. The href is either a path on
 * this site (`/insights/<slug>`, `/employers/request-talent`) or an
 * absolute https URL; the importer resolves every document link to one of
 * those or drops it, so a renderer never sees a link to a page that does
 * not exist. Links between the articles are a ranking signal for the whole
 * cluster, which is why they are carried rather than flattened to text.
 */
export type LinkMark = {
  start: number;
  end: number;
  href: string;
};

/** A run of prose. `links` is present only when there is at least one. */
export type RichText = {
  text: string;
  links?: LinkMark[];
};

/**
 * One question and its answer in paragraphs. Also feeds FAQPage JSON-LD,
 * which uses the plain `text` of each paragraph.
 */
export type ArticleFaq = {
  question: string;
  answer: RichText[];
};

/** A cited source. Rendered as a visible link; the URL is always https. */
export type ArticleSource = {
  name: string;
  url: string;
};

export type Article = {
  /** Stable id from the source system. Today, the slug. */
  id: string;
  /** URL segment. Unique, and must not change once published. */
  slug: string;
  /** The visible h1. */
  title: string;
  /** The <title>. The layout appends the site name. */
  metaTitle: string;
  /** The meta description, and the BlogPosting description. */
  metaDescription: string;
  /** The opening paragraph, which answers the question the title asks. */
  summary: string;
  /**
   * The "Key takeaways" box. The heading comes from the source because two
   * articles label it "Key statistics at a glance" with the period the
   * figures cover, and that period is part of the attribution.
   */
  keyTakeaways: { heading: string; items: string[] };
  body: ArticleBlock[];
  /** Empty when the article has no FAQ section; then no FAQPage is emitted. */
  faqs: ArticleFaq[];
  sources: ArticleSource[];
  /** Slugs of other published articles the source document cross-linked. */
  related: string[];
  /** ISO 8601 date, e.g. "2026-09-21". */
  datePublished: string;
  /** ISO 8601 date. Equal to datePublished until the piece is edited. */
  dateModified: string;
};

/** Newest first, then alphabetical so the order is stable within a day. */
export function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort(
    (a, b) =>
      b.datePublished.localeCompare(a.datePublished) ||
      a.title.localeCompare(b.title),
  );
}

/**
 * Every published article, newest first.
 *
 * TODO(api): when the CMS lands, replace the generated index with the fetch.
 * Whatever lands here must satisfy the Article type, including the
 * structured body - if the source returns HTML, the mapping layer parses it
 * into blocks rather than widening the type to accept a string.
 *
 *   const response = await fetch(`${process.env.CMS_API_URL}/articles`, {
 *     headers: { Accept: "application/json" },
 *     next: { revalidate: 600 },
 *   });
 *   if (!response.ok) return [];   // an empty index beats a broken page
 *   const payload: unknown = await response.json();
 *   return sortArticles(parseArticles(payload)); // validate; never trust it
 *
 * An empty array is a valid, expected answer and the index renders a real
 * empty state for it. It is never a reason to invent a post.
 */
export async function getArticles(): Promise<Article[]> {
  return sortArticles(importedArticles);
}

/** The articles an article cross-links, in its own order, skipping any gap. */
export async function getRelatedArticles(article: Article): Promise<Article[]> {
  const articles = await getArticles();
  return article.related
    .map((slug) => articles.find((other) => other.slug === slug))
    .filter((other) => other !== undefined);
}

/** One article by slug, or null. Null means 404. */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getArticles();
  return articles.find((article) => article.slug === slug) ?? null;
}
