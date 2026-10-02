import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";

/**
 * The public site's chrome: skip link, header, the one <main>, footer.
 *
 * Rendered by app/(marketing)/layout.tsx for every public route, and by
 * app/not-found.tsx, which renders in the root layout above every route
 * group and so would otherwise have none. The root layout renders no chrome
 * at all, so (internal) and (portal) bring their own.
 *
 * The skip link is the first focusable element, and <main> takes
 * tabIndex={-1} so focus actually lands there rather than only scrolling.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
