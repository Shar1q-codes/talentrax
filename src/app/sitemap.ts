import type { MetadataRoute } from "next";

import { SITE_URL } from "@/content/site";
import { getArticles } from "@/lib/insights";
import { getJobs, isExpired } from "@/lib/jobs";

/**
 * Sitemap.
 *
 * Built routes only. The other 2 render the coming-soon page and set robots
 * index:false, so listing them would ask crawlers to index pages we have
 * explicitly told them to skip - a contradictory signal.
 *
 * As each section is built, three edits belong together: remove its noIndex
 * from the route, drop it from `comingSoonRoutes` in content/navigation.ts
 * and from COMING_SOON_ROUTES in scripts/check-seo.sh, and add it here.
 */
const BUILT_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/employers", priority: 0.9 },
  { path: "/employers/services", priority: 0.8 },
  { path: "/employers/request-talent", priority: 0.8 },
  { path: "/job-seekers", priority: 0.9 },
  { path: "/job-seekers/upload-resume", priority: 0.8 },
  { path: "/jobs", priority: 0.9 },
  { path: "/about", priority: 0.7 },
  { path: "/contact", priority: 0.7 },
  { path: "/faq", priority: 0.6 },
  { path: "/resources", priority: 0.6 },
  { path: "/insights", priority: 0.6 },
  { path: "/locations", priority: 0.6 },
  // Legal pages are indexable but low priority: people arrive at them from
  // the footer or a direct link, not from search.
  { path: "/privacy-policy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/accessibility", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const pages: MetadataRoute.Sitemap = BUILT_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));

  /**
   * One entry per live job posting. Empty today because getJobs() is, and
   * wired now so that real postings appear here without a code change.
   *
   * Expired postings are filtered out rather than listed: their URLs answer
   * 410 Gone, and asking a crawler to fetch a URL we have told it is gone is
   * the same contradiction as listing a noindex page.
   */
  const jobs = await getJobs();
  const postings: MetadataRoute.Sitemap = jobs
    .filter((job) => !isExpired(job))
    .map((job) => ({
      url: `${SITE_URL}/jobs/${job.slug}`,
      lastModified: new Date(job.datePosted),
      changeFrequency: "daily",
      priority: 0.8,
    }));

  /**
   * One entry per published article. Empty today because getArticles() is,
   * and wired now so that real articles appear here without a code change.
   */
  const articles = await getArticles();
  const posts: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/insights/${article.slug}`,
    lastModified: new Date(article.dateModified),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...pages, ...postings, ...posts];
}
