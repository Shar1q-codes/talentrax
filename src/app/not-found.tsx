import type { Metadata } from "next";

import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * No `robots` here on purpose. Next injects <meta name="robots" content="noindex">
 * itself on any page that returns a 404, so setting it again emitted two tags
 * with the same meaning and tripped SEO audits. Let the framework's tag stand.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for could not be found.",
};

/**
 * Custom 404 for an unmatched URL. It renders in the root layout, above
 * every route group, and the root layout has no chrome, so it draws the
 * public site's own: the real header and footer are present and the
 * visitor is never stranded on a bare error page. An unknown URL anywhere,
 * an internal one included, looks like any other unknown URL.
 *
 * notFound() thrown inside a public route renders
 * app/(marketing)/not-found.tsx instead - see NotFoundContent.
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  );
}
