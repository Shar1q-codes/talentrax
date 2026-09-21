import type { Metadata } from "next";

import { EmployersHero } from "@/components/employers/EmployersHero";
import { EngagementModels } from "@/components/employers/EngagementModels";
import { ProcessTimeline } from "@/components/shared/ProcessTimeline";
import { SpecialtyAreas } from "@/components/shared/SpecialtyAreas";
import { CtaBand } from "@/components/ui/CtaBand";
import {
  employersCta,
  employersMeta,
  searchProcess,
  specialtySection,
} from "@/content/employers";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, and it is listed in app/sitemap.ts. Those two
// edits belong together - see CLAUDE.md, rule 5.
export const metadata: Metadata = buildMetadata({
  title: employersMeta.overview.title,
  description: employersMeta.overview.description,
  path: "/employers",
});

/**
 * Employers landing page. Section order:
 * hero, engagement models, specialty desks, how a search runs, closing CTA.
 *
 * The process section is the long one on purpose. With no statistics or
 * testimonials permitted anywhere on this site, a description of how the work
 * actually runs is what has to carry the credibility.
 */
export default function Page() {
  return (
    <>
      <EmployersHero />
      <EngagementModels />
      <SpecialtyAreas content={specialtySection} />
      <ProcessTimeline
        content={searchProcess}
        id="how-a-search-runs"
        headingId="how-a-search-runs-heading"
      />
      <CtaBand content={employersCta} headingId="employers-cta-heading" />
    </>
  );
}
