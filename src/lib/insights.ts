/**
 * The insights index data source.
 *
 * THERE ARE NO ARTICLES. `getArticles()` returns an empty array, and that is
 * the honest state of this publication today. Nothing in this file, and
 * nothing that reaches the build output, contains a sample, example or
 * placeholder article. The home page shipped three invented article cards
 * once; they were fabricated content on the most-indexed page on the site and
 * had to be torn out. This is the same mistake with a slug attached.
 *
 * Test fixtures live in insights.fixture.ts, which no page imports.
 *
 * NO AUTHOR FIELD, deliberately. Nobody has been named anywhere on this site
 * and a byline field is an invitation to invent one. If real authorship is
 * needed later that is a decision to take on purpose, not a property that was
 * already sitting there.
 *
 * NO VALUE IMPORTS HERE, on purpose - everything below is pure and dependency
 * free so the unit tests can import it directly under `node --test`.
 */

/**
 * A body block. Structured, not a raw HTML string: a CMS swap stays a mapping
 * exercise rather than a rewrite, and nothing downstream is ever handed
 * untrusted markup to render.
 *
 * There is deliberately no "quote" block. A pull quote from a named person is
 * a testimonial with better typography, and the content rules forbid those.
 */
export type ArticleBlock =
  | { kind: "paragraph"; text: string }
  /** Rendered as an h2 inside the article body, under the title. */
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] };

export type Article = {
  /** Stable id from the source system. */
  id: string;
  /** URL segment. Unique, and must not change once published. */
  slug: string;
  title: string;
  /** One or two sentences under the title. Also the meta description. */
  standfirst: string;
  /** ISO 8601 date, e.g. "2026-09-21". */
  datePublished: string;
  /** ISO 8601 date. Equal to datePublished until the piece is edited. */
  dateModified: string;
  body: ArticleBlock[];
};

/**
 * Every published article, newest first.
 *
 * TODO(api): replace the empty array with the CMS fetch. Whatever lands here
 * must satisfy the Article type, including the structured body - if the
 * source returns HTML, the mapping layer parses it into blocks rather than
 * widening the type to accept a string.
 *
 *   const response = await fetch(`${process.env.CMS_API_URL}/articles`, {
 *     headers: { Accept: "application/json" },
 *     next: { revalidate: 600 },
 *   });
 *   if (!response.ok) return [];   // an empty index beats a broken page
 *   const payload: unknown = await response.json();
 *   return parseArticles(payload); // validate; never trust the shape
 *
 * An empty array is a valid, expected answer and the index renders a real
 * empty state for it. It is never a reason to invent a post.
 */
export async function getArticles(): Promise<Article[]> {
  return [];
}

/** One article by slug, or null. Null means 404. */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getArticles();
  return articles.find((article) => article.slug === slug) ?? null;
}
