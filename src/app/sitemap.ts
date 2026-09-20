import type { MetadataRoute } from "next";

import { SITE_URL } from "@/content/site";

/**
 * Sitemap.
 *
 * Only "/" is listed. The other 19 routes render the coming-soon page and set
 * robots index:false, so listing them would ask crawlers to index pages we
 * have explicitly told them to skip - a contradictory signal.
 *
 * As each section is built: remove its noIndex from the route's
 * buildMetadata call, then add an entry here. Those two edits belong together.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
