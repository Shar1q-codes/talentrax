import type { ReactNode } from "react";

/**
 * The public marketing site: every route that exists today.
 *
 * Renders nothing of its own. The header, footer, skip link and <main> stay
 * in the root layout, because app/not-found.tsx renders there and must keep
 * them: moving the chrome into this group would strip it from the 404 page.
 * When (portal) or (internal) need different chrome, that is the moment to
 * split the root layout, not before.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
