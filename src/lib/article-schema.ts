/**
 * schema.org BlogPosting generator.
 *
 * Same shape as job-posting-schema.ts, and for the same reason: structured
 * data fails silently, so it gets unit tests while the rest of the site gets
 * a careful read. The publisher is passed in rather than imported, which
 * keeps this module free of value imports so the tests can run it directly.
 *
 * NO AUTHOR. The Article type has no author field (see insights.ts) and this
 * generator does not invent one. `author` is optional in schema.org for
 * BlogPosting; a fabricated byline in machine-readable form is worse than an
 * absent one.
 *
 * Reference: https://developers.google.com/search/docs/appearance/structured-data/article
 */

import type { Article } from "./insights";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type BlogPostingJsonLd = Record<string, JsonLdValue>;

export type PublishingOrganization = {
  name: string;
  /** Absolute origin, no trailing slash. */
  siteUrl: string;
};

/** The canonical URL of one article. */
export function articleUrl(siteUrl: string, slug: string): string {
  return `${siteUrl}/insights/${slug}`;
}

export function blogPostingJsonLd(
  article: Article,
  organization: PublishingOrganization,
): BlogPostingJsonLd {
  const url = articleUrl(organization.siteUrl, article.slug);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.standfirst,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    publisher: {
      "@type": "Organization",
      name: organization.name,
      url: organization.siteUrl,
    },
    url,
  };
}
