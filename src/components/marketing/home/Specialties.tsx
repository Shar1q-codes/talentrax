import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import { specialties } from "@/content/home";

/** Three specialty desks: Healthcare, IT, Professional. */
export function Specialties() {
  return (
    <Section id="specialties" tone="muted" labelledBy="specialties-heading">
      <SectionHeader
        headingId="specialties-heading"
        eyebrow={specialties.eyebrow}
        heading={specialties.heading}
        intro={specialties.intro}
      />

      <ul className="grid gap-6 lg:grid-cols-3">
        {specialties.cards.map((card) => (
          <Card as="li" key={card.id} className="flex flex-col">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand text-white">
              <Icon name={card.icon} />
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">{card.title}</h3>
            <p className="mt-3 text-base text-ink-muted">{card.description}</p>

            <h4 className="mt-6 text-sm font-semibold tracking-widest text-ink-subtle uppercase">
              Example disciplines
            </h4>
            <ul className="mt-3 flex flex-1 flex-col gap-2">
              {card.examples.map((example) => (
                <li
                  key={example}
                  className="flex items-start gap-2 text-base text-ink-muted"
                >
                  <Icon
                    name="check"
                    className="mt-1 h-4 w-4 shrink-0 text-accent"
                  />
                  {example}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </ul>

      <div className="mt-10">
        <ButtonLink
          href={specialties.cta.href}
          variant={specialties.cta.variant}
        >
          {specialties.cta.label}
        </ButtonLink>
      </div>
    </Section>
  );
}
