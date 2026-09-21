import type { MetadataRoute } from "next";

import { SITE_URL } from "@/content/site";

/**
 * Sitemap.
 *
 * Built routes only. The other 11 render the coming-soon page and set robots
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
  { path: "/about", priority: 0.7 },
  { path: "/contact", priority: 0.7 },
  // Legal pages are indexable but low priority: people arrive at them from
  // the footer or a direct link, not from search.
  { path: "/privacy-policy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return BUILT_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
