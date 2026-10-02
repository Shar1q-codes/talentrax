import type { ReactNode } from "react";

import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * The public marketing site: every public route.
 *
 * The chrome lives here, not in the root layout, so the staff and portal
 * route groups do not inherit the marketing navigation. app/not-found.tsx
 * renders above every group and draws the same SiteChrome itself.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
