import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";

/**
 * Page masthead for routes that do not open with a full hero: eyebrow, the
 * page's single <h1>, an intro, and an optional slot underneath for CTAs or
 * an in-page nav.
 *
 * Bordered rather than tinted so it reads as part of the page it introduces
 * and never competes with a section band below it.
 */
export function PageHeader({
  eyebrow,
  heading,
  intro,
  children,
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-surface">
      <Container>
        <div className="py-14 sm:py-16 lg:py-20">
          {eyebrow ? (
            <p className="text-sm font-semibold tracking-widest text-accent uppercase">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {heading}
          </h1>

          {intro ? (
            <p className="mt-6 max-w-3xl text-lg text-ink-muted">{intro}</p>
          ) : null}

          {children}
        </div>
      </Container>
    </div>
  );
}
