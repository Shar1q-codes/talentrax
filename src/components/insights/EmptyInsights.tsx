import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { emptyIndex } from "@/content/insights";

/**
 * What /insights shows while nothing is published, which is today.
 *
 * Deliberately not a "coming soon", an error state or an apology. A
 * publication with nothing in it yet is an ordinary state, so the page says
 * that, says why, and routes both audiences to something that does exist.
 *
 * Mirrors components/jobs/EmptyBoard.tsx on purpose - two empty machines on
 * one site should look like a decision rather than two accidents.
 */
export function EmptyInsights() {
  return (
    <div>
      <div className="max-w-3xl rounded-xl border border-brand bg-brand-soft p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          {emptyIndex.heading}
        </h2>
        {emptyIndex.body.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-base text-ink-muted">
            {paragraph}
          </p>
        ))}
      </div>

      <ul className="mt-8 grid gap-6 lg:grid-cols-2">
        {emptyIndex.routes.map((route) => (
          <Card as="li" key={route.id} className="flex flex-col">
            <h3 className="text-xl font-bold text-ink">{route.title}</h3>
            <p className="mt-3 flex-1 text-base text-ink-muted">
              {route.description}
            </p>
            <div className="mt-6">
              <ButtonLink href={route.href} variant="primary">
                {route.linkLabel}
              </ButtonLink>
            </div>
          </Card>
        ))}
      </ul>

      <p className="mt-8 text-base text-ink-muted">
        {emptyIndex.guidanceLinkIntro}{" "}
        <Link
          href={emptyIndex.guidanceLinkHref}
          className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
        >
          {emptyIndex.guidanceLinkLabel}
        </Link>
        .
      </p>
    </div>
  );
}
