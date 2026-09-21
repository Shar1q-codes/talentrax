import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand } from "@/components/ui/CtaBand";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, SectionHeader } from "@/components/ui/Section";
import {
  deskCovers,
  deskLabel,
  deskSection,
  interviewPrep,
  resourcesCta,
  resourcesHero,
  resourcesMeta,
  resumeGuidance,
  type GuidanceBlock,
} from "@/content/resources";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 5.
export const metadata: Metadata = buildMetadata({
  title: resourcesMeta.title,
  description: resourcesMeta.description,
  path: "/resources",
});

/**
 * Resources: interview preparation and resume guidance, and nothing else.
 *
 * NOT salary guides or any other pay data - see the header of
 * content/resources.ts. There are no numbers on this page at all, no claims
 * about what anyone at this firm has observed, no byline and no downloads.
 *
 * One page, not /resources/interviews and /resources/resumes. There is not
 * enough here to justify splitting it, and thin split pages are the problem
 * /specialties was deleted over.
 *
 * Headings run h1 (page) -> h2 (section) -> h3 (block), nothing skipped.
 */
function Blocks({ blocks }: { blocks: GuidanceBlock[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      {blocks.map((block) => (
        <div key={block.id} id={block.id}>
          <h3 className="text-xl font-bold text-ink">{block.heading}</h3>
          {block.intro ? (
            <p className="mt-3 text-base text-ink-muted">{block.intro}</p>
          ) : null}
          <ul className="mt-4 flex flex-col gap-3">
            {block.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-base text-ink-muted"
              >
                <Icon
                  name="check"
                  className="mt-1.5 h-4 w-4 shrink-0 text-accent"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SectionLink({ label, href }: { label: string; href: string }) {
  return (
    <p className="mt-10 text-base">
      <Link
        href={href}
        className="link-inline"
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
        eyebrow={resourcesHero.eyebrow}
        heading={resourcesHero.heading}
        intro={resourcesHero.intro}
      />

      <Section
        id="interview-preparation"
        labelledBy="interview-preparation-heading"
      >
        <SectionHeader
          headingId="interview-preparation-heading"
          eyebrow={interviewPrep.eyebrow}
          heading={interviewPrep.heading}
          intro={interviewPrep.intro}
        />
        <Blocks blocks={interviewPrep.blocks} />
        <SectionLink
          label={interviewPrep.link.label}
          href={interviewPrep.link.href}
        />
      </Section>

      <Section
        id="resume-guidance"
        tone="muted"
        labelledBy="resume-guidance-heading"
      >
        <SectionHeader
          headingId="resume-guidance-heading"
          eyebrow={resumeGuidance.eyebrow}
          heading={resumeGuidance.heading}
          intro={resumeGuidance.intro}
        />
        <Blocks blocks={resumeGuidance.blocks} />
        <SectionLink
          label={resumeGuidance.link.label}
          href={resumeGuidance.link.href}
        />
      </Section>

      <Section id="by-desk" labelledBy="by-desk-heading">
        <SectionHeader
          headingId="by-desk-heading"
          eyebrow={deskSection.eyebrow}
          heading={deskSection.heading}
          intro={deskSection.intro}
        />
        <div className="grid gap-10 lg:grid-cols-3">
          {deskSection.guidance.map((desk) => (
            <div key={desk.deskId}>
              <h3 className="text-xl font-bold text-ink">
                {deskLabel(desk.deskId)}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">
                <span className="font-semibold">{deskSection.coversLabel}:</span>{" "}
                {deskCovers(desk.deskId)}
              </p>
              <ul className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                {desk.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-base text-ink-muted"
                  >
                    <Icon
                      name="check"
                      className="mt-1.5 h-4 w-4 shrink-0 text-accent"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand content={resourcesCta} headingId="resources-cta-heading" />
    </>
  );
}
