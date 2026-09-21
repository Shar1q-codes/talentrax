import type { Metadata } from "next";

import { CommitmentPanel } from "@/components/shared/ProcessTimeline";
import { SpecialtyAreas } from "@/components/shared/SpecialtyAreas";
import { CtaBand } from "@/components/ui/CtaBand";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, SectionHeader } from "@/components/ui/Section";
import {
  aboutCta,
  aboutHero,
  aboutMeta,
  aboutSpecialtySection,
  howWeWork,
  whatWeDo,
  whereWeRecruit,
} from "@/content/about";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 5.
export const metadata: Metadata = buildMetadata({
  title: aboutMeta.title,
  description: aboutMeta.description,
  path: "/about",
});

/**
 * About.
 *
 * No numbers of any kind, which on an about page rules out most of the usual
 * furniture: no founding year, no years in business, no placements, no team
 * size, no offices. No founder story, no mission block, no bios, no named
 * people either.
 *
 * What is left has to carry it: what the work is, which desks do it, and how
 * it actually runs. The "How we work" promises come from
 * content/commitments.ts - the same objects /employers and /job-seekers
 * render - so this page cannot make a fourth version of the same commitment.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={aboutHero.eyebrow}
        heading={aboutHero.heading}
        intro={aboutHero.intro}
      />

      <Section id="what-we-do" labelledBy="what-we-do-heading">
        <SectionHeader
          headingId="what-we-do-heading"
          eyebrow={whatWeDo.eyebrow}
          heading={whatWeDo.heading}
          intro={whatWeDo.intro}
        />
        <div className="max-w-3xl">
          {whatWeDo.body.map((paragraph) => (
            <p key={paragraph} className="text-lg text-ink-muted">
              {paragraph}
            </p>
          ))}
          <p className="mt-5 text-lg text-ink-muted">{whatWeDo.modelsLine}</p>
        </div>
      </Section>

      <SpecialtyAreas content={aboutSpecialtySection} />

      <Section id="how-we-work" labelledBy="how-we-work-heading">
        <SectionHeader
          headingId="how-we-work-heading"
          eyebrow={howWeWork.eyebrow}
          heading={howWeWork.heading}
          intro={howWeWork.intro}
        />
        <CommitmentPanel commitments={howWeWork.commitments} className="mt-0" />
      </Section>

      <Section
        id="where-we-recruit"
        tone="muted"
        labelledBy="where-we-recruit-heading"
      >
        <SectionHeader
          headingId="where-we-recruit-heading"
          eyebrow={whereWeRecruit.eyebrow}
          heading={whereWeRecruit.heading}
          intro={whereWeRecruit.intro}
        />
        <div className="max-w-3xl">
          {whereWeRecruit.body.map((paragraph) => (
            <p key={paragraph} className="text-lg text-ink-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      <CtaBand content={aboutCta} headingId="about-cta-heading" />
    </>
  );
}
