import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import { services } from "@/content/home";

/**
 * Three service cards. Rendered as a <ul> because it is an unordered set of
 * peers; each card's <h3> sits under the section <h2>, keeping heading order
 * contiguous (h1 -> h2 -> h3, nothing skipped).
 */
export function Services() {
  return (
    <Section id="services" labelledBy="services-heading">
      <SectionHeader
        headingId="services-heading"
        eyebrow={services.eyebrow}
        heading={services.heading}
        intro={services.intro}
      />

      <ul className="grid gap-6 lg:grid-cols-3">
        {services.cards.map((card) => (
          <Card
            as="li"
            key={card.id}
            className="flex flex-col hover:border-border-strong"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Icon name={card.icon} />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">{card.title}</h3>
            <p className="mt-3 flex-1 text-base text-ink-muted">
              {card.description}
            </p>
            <p className="mt-5 border-t border-border pt-4 text-sm font-medium text-ink-subtle">
              {card.bestFor}
            </p>
          </Card>
        ))}
      </ul>

      <div className="mt-10">
        <ButtonLink href={services.cta.href} variant={services.cta.variant}>
          {services.cta.label}
        </ButtonLink>
      </div>
    </Section>
  );
}
