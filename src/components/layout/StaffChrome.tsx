import type { ReactNode } from "react";

import { SkipLink } from "@/components/layout/SkipLink";
import { Container } from "@/components/ui/Container";
import { site } from "@/content/site";

/**
 * The staff area's chrome: skip link, a plain header with the name, the one
 * <main>. No public navigation and no footer: nothing here leads back into
 * the marketing site, and nothing on the marketing site leads here.
 *
 * Not an access check. Every staff page asks the data access layer itself
 * (features/auth/queries.server.ts).
 */
export function StaffChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="border-b border-border bg-surface">
        <Container>
          <p className="py-4 text-base font-bold text-ink">{site.name}</p>
        </Container>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
    </>
  );
}
