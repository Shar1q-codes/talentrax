import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import { specialtyAreas } from "@/content/taxonomy";
import type { SectionIntro } from "@/content/types";

/**
 * The three desks and the disciplines each one recruits.
 *
 * The desk data comes from content/taxonomy.ts, so the Employers page and the
 * Job Seekers page cannot end up advertising different specialties; only the
 * surrounding copy differs, and that arrives as `content`.
 *
 * The desks are a <ul> of peers, matching the pattern on the home page.
 * Inside each card the sub-specialties are a description list: the discipline
 * is the term and what sits inside it is the description, which is exactly
 * the pairing a <dl> encodes. A flat <ul> would throw that relationship away.
 */
export function SpecialtyAreas({
  content,
  id = "specialties",
  headingId = "specialties-heading",
  tone = "muted",
}: {
  content: SectionIntro;
  id?: string;
  headingId?: string;
  tone?: "default" | "muted";
}) {
  return (
    <Section id={id} tone={tone} labelledBy={headingId}>
      <SectionHeader
        headingId={headingId}
        eyebrow={content.eyebrow}
        heading={content.heading}
        intro={content.intro}
      />

      <ul className="grid gap-6 lg:grid-cols-3">
        {specialtyAreas.map((area) => (
          <Card as="li" key={area.id} className="flex flex-col">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand text-white">
              <Icon name={area.icon} />
            </span>

            <h3 className="mt-5 text-xl font-bold text-ink">{area.name}</h3>

            <p className="mt-3 text-base text-ink-muted">{area.description}</p>

            <dl className="mt-6 flex flex-1 flex-col gap-4 border-t border-border pt-5">
              {area.subSpecialties.map((sub) => (
                <div key={sub.id}>
                  <dt className="flex items-start gap-2 text-base font-semibold text-ink">
                    <Icon
                      name="check"
                      className="mt-1.5 h-4 w-4 shrink-0 text-accent"
                    />
                    {sub.name}
                  </dt>
                  <dd className="mt-1 pl-6 text-sm text-ink-muted">
                    {sub.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
