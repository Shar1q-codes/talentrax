import type { MetadataRoute } from "next";

import { SITE_URL } from "@/content/site";

/**
 * robots.txt
 *
 * Crawling is allowed site-wide. Keeping the coming-soon routes crawlable but
 * non-indexable is deliberate: a `Disallow` here would stop crawlers reading
 * the pages at all, which means they would never see the `noindex` directive
 * those pages set. Allow the crawl, let the per-page robots meta do the work.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
