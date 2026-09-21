import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand } from "@/components/ui/CtaBand";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, SectionHeader } from "@/components/ui/Section";
import {
  clinical,
  forEmployers,
  locationsCta,
  locationsHero,
  locationsMeta,
  nationwide,
  onRole,
  relocation,
} from "@/content/locations";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 4.
export const metadata: Metadata = buildMetadata({
  title: locationsMeta.title,
  description: locationsMeta.description,
  path: "/locations",
});

/**
 * Locations.
 *
 * NO MARKET LIST, no map, no office addresses, and no per-state sub-routes.
 * The page answers the question people actually arrive with - can you help me
 * where I am, and how does location work on these roles - rather than the one
 * a locations page usually answers badly.
 *
 * It also carries no regulatory detail: licensure is named as something that
 * shapes a clinical role and the posting is named as the authority. See the
 * header of content/locations.ts before adding anything here.
 *
 * Headings run h1 (page) -> h2 (section), with the work arrangements as a
 * description list rather than a third heading level.
 */
function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="max-w-3xl">
      {items.map((paragraph) => (
        <p key={paragraph} className="mt-5 text-base text-ink-muted first:mt-0">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function SectionLink({ label, href }: { label: string; href: string }) {
  return (
    <p className="mt-8 text-base">
      <Link
        href={href}
        className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
      >
        {label}
        <span aria-hidden="true"> &rarr;</span>
      </Link>
    </p>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={locationsHero.eyebrow}
        heading={locationsHero.heading}
        intro={locationsHero.intro}
      />

      <Section id="coverage" labelledBy="coverage-heading">
        <SectionHeader
          headingId="coverage-heading"
          eyebrow={nationwide.eyebrow}
          heading={nationwide.heading}
          intro={nationwide.intro}
        />
        <Paragraphs items={nationwide.body} />
      </Section>

      <Section id="on-a-role" tone="muted" labelledBy="on-a-role-heading">
        <SectionHeader
          headingId="on-a-role-heading"
          eyebrow={onRole.eyebrow}
          heading={onRole.heading}
          intro={onRole.intro}
        />

        <dl className="grid max-w-3xl gap-6 sm:grid-cols-3">
          {onRole.modes.map((mode) => (
            <div key={mode.value}>
              <dt className="flex items-start gap-2 text-base font-bold text-ink">
                <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-brand" />
                {mode.label}
              </dt>
              <dd className="mt-1 pl-7 text-base text-ink-muted">{mode.hint}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <Paragraphs items={onRole.body} />
        </div>
        <SectionLink label={onRole.link.label} href={onRole.link.href} />
      </Section>

      <Section id="clinical-roles" labelledBy="clinical-roles-heading">
        <SectionHeader
          headingId="clinical-roles-heading"
          eyebrow={clinical.eyebrow}
          heading={clinical.heading}
          intro={clinical.intro}
        />
        <Paragraphs items={clinical.body} />
        <p className="mt-8 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted">
          {clinical.note}
        </p>
      </Section>

      <Section id="relocation" tone="muted" labelledBy="relocation-heading">
        <SectionHeader
          headingId="relocation-heading"
          eyebrow={relocation.eyebrow}
          heading={relocation.heading}
          intro={relocation.intro}
        />
        <Paragraphs items={relocation.body} />
      </Section>

      <Section id="for-employers" labelledBy="for-employers-heading">
        <SectionHeader
          headingId="for-employers-heading"
          eyebrow={forEmployers.eyebrow}
          heading={forEmployers.heading}
          intro={forEmployers.intro}
        />
        <Paragraphs items={forEmployers.body} />
        <SectionLink
          label={forEmployers.link.label}
          href={forEmployers.link.href}
        />
      </Section>

      <CtaBand content={locationsCta} headingId="locations-cta-heading" />
    </>
  );
}
