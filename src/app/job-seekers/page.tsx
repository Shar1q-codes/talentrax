import type { Metadata } from "next";

import { ConsentPromise } from "@/components/job-seekers/ConsentPromise";
import { ProcessTimeline } from "@/components/shared/ProcessTimeline";
import { SpecialtyAreas } from "@/components/shared/SpecialtyAreas";
import { ButtonLink } from "@/components/ui/Button";
import { CtaBand } from "@/components/ui/CtaBand";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  applyProcess,
  jobSeekerSpecialtySection,
  jobSeekersCta,
  jobSeekersHero,
  jobSeekersMeta,
} from "@/content/job-seekers";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 4.
export const metadata: Metadata = buildMetadata({
  title: jobSeekersMeta.overview.title,
  description: jobSeekersMeta.overview.description,
  path: "/job-seekers",
});

/**
 * Job Seekers landing page. Section order:
 * header, how applying works, what we recruit for, your data, closing CTA.
 *
 * The process and specialty sections are the same components the Employers
 * page uses, reading the same desk data, so the two halves of the site
 * describe one business rather than two.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={jobSeekersHero.eyebrow}
        heading={jobSeekersHero.heading}
        intro={jobSeekersHero.intro}
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {jobSeekersHero.ctas.map((cta) => (
            <ButtonLink
              key={cta.href}
              href={cta.href}
              variant={cta.variant}
              size="lg"
            >
              {cta.label}
            </ButtonLink>
          ))}
        </div>
      </PageHeader>

      <ProcessTimeline
        content={applyProcess}
        id="how-applying-works"
        headingId="how-applying-works-heading"
      />

      <SpecialtyAreas content={jobSeekerSpecialtySection} />

      <ConsentPromise />

      <CtaBand content={jobSeekersCta} headingId="job-seekers-cta-heading" />
    </>
  );
}
