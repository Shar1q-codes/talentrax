import type { Metadata } from "next";

import { SITE_URL, site } from "@/content/site";

/**
 * metadataBase drives how Next resolves every relative URL in metadata
 * (canonicals, OG urls). Sourced from NEXT_PUBLIC_SITE_URL with a localhost
 * fallback so local dev and CI builds work without env setup.
 */
export const metadataBase = new URL(SITE_URL);

export type RouteMetadataInput = {
  /** Page-specific title. The root layout appends the site name. */
  title: string;
  description: string;
  /** Route path, leading slash, e.g. "/employers/services". */
  path: string;
  /**
   * Coming-soon routes pass true. Emits robots index:false, follow:true so
   * crawlers still traverse the nav but do not index empty pages.
   */
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  noIndex = false,
}: RouteMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    robots: {
      index: !noIndex,
      follow: true,
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      url: path,
      locale: site.locale.replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.name}`,
      description,
    },
  };
}
