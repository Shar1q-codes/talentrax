import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, SectionHeader } from "@/components/ui/Section";
import { insights } from "@/content/home";

/**
 * Three placeholder article cards.
 *
 * No author is named and no publication date is shown: no articles exist yet
 * and inventing a byline would attribute writing to a person who does not
 * exist. The note under the grid states the placeholder status on the page
 * itself, not just in a comment.
 *
 * Each card's thumbnail is an IMAGE SLOT (gradient block, aria-hidden).
 * The whole card is not a link; the heading holds the link, which keeps the
 * accessible name short and the link list usable.
 */
export function InsightsTeaser() {
  return (
    <Section id="insights" labelledBy="insights-heading">
      <SectionHeader
        headingId="insights-heading"
        eyebrow={insights.eyebrow}
        heading={insights.heading}
        intro={insights.intro}
      />

      <ul className="grid gap-6 lg:grid-cols-3">
        {insights.articles.map((article) => (
          <Card
            as="li"
            key={article.id}
            className="flex flex-col overflow-hidden p-0"
          >
            {/* IMAGE SLOT - replace with article artwork. */}
            <div
              className="image-slot-soft aspect-16/9 w-full border-b border-border"
              aria-hidden="true"
            />
            <div className="flex flex-1 flex-col p-6">
              <p className="text-sm font-semibold tracking-widest text-accent uppercase">
                {article.category}
              </p>
              <h3 className="mt-3 text-lg font-bold text-ink">
                <Link
                  href={article.href}
                  className="no-underline transition-colors hover:text-brand hover:underline hover:underline-offset-4"
                >
                  {article.title}
                </Link>
              </h3>
              <p className="mt-3 flex-1 text-base text-ink-muted">
                {article.excerpt}
              </p>
              <p className="mt-5 text-sm text-ink-subtle">
                {article.readingTime}
              </p>
            </div>
          </Card>
        ))}
      </ul>

      <p className="mt-8 text-sm text-ink-subtle">{insights.note}</p>

      <div className="mt-8">
        <ButtonLink href={insights.cta.href} variant={insights.cta.variant}>
          {insights.cta.label}
        </ButtonLink>
      </div>
    </Section>
  );
}
