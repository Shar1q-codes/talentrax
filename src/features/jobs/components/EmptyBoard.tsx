import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { emptyBoard } from "@/content/jobs";

/**
 * What /jobs shows when there are no open roles, which is today.
 *
 * Deliberately not a "coming soon", an error state or an apology. The board
 * being empty is a true and ordinary state of a staffing business, so the
 * page says that, explains why it happens, and routes both audiences
 * somewhere that is actually useful.
 *
 * No filter controls render above this: see JobBoard.tsx.
 */
export function EmptyBoard() {
  return (
    <div>
      <div className="max-w-3xl rounded-xl border border-brand bg-brand-soft p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          {emptyBoard.heading}
        </h2>
        {emptyBoard.body.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-base text-ink-muted">
            {paragraph}
          </p>
        ))}
      </div>

      <ul className="mt-8 grid gap-6 lg:grid-cols-2">
        {emptyBoard.routes.map((route) => (
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
        {emptyBoard.processLinkIntro}{" "}
        <Link
          href={emptyBoard.processLinkHref}
          className="link-inline"
        >
          {emptyBoard.processLinkLabel}
        </Link>
        .
      </p>
    </div>
  );
}
