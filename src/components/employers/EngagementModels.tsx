import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import { engagementSection, serviceHref } from "@/content/employers";
import { engagementModels } from "@/content/taxonomy";

/**
 * The three engagement models as cards, each linking to its own section on the
 * services page.
 *
 * One link per card, on the <h3>, matching the pattern used by the insights
 * cards on the home page. The whole card is not a link: that would make the
 * accessible name the entire card text and fill the page's link list with
 * paragraphs. The arrow is decoration on an already-named link, so it is
 * aria-hidden.
 */
export function EngagementModels() {
  return (
    <Section id="engagement-models" labelledBy="engagement-models-heading">
      <SectionHeader
        headingId="engagement-models-heading"
        eyebrow={engagementSection.eyebrow}
        heading={engagementSection.heading}
        intro={engagementSection.intro}
      />

      <ul className="grid gap-6 lg:grid-cols-3">
        {engagementModels.map((model) => (
          <Card
            as="li"
            key={model.id}
            className="flex flex-col hover:border-border-strong"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Icon name={model.icon} />
            </span>

            <h3 className="mt-5 text-xl font-bold text-ink">
              <Link
                href={serviceHref(model.id)}
                className="no-underline transition-colors hover:text-brand hover:underline hover:underline-offset-4"
              >
                {model.name}
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </h3>

            <p className="mt-3 flex-1 text-base text-ink-muted">
              {model.summary}
            </p>

            <p className="mt-5 border-t border-border pt-4 text-sm font-medium text-ink-subtle">
              {model.bestFor}
            </p>
          </Card>
        ))}
      </ul>

      <div className="mt-10">
        <ButtonLink
          href={engagementSection.cta.href}
          variant={engagementSection.cta.variant}
        >
          {engagementSection.cta.label}
        </ButtonLink>
      </div>
    </Section>
  );
}
