import type { Metadata } from "next";

import { EmptyBoard } from "@/components/jobs/EmptyBoard";
import { JobBoard } from "@/components/jobs/JobBoard";
import { CtaBand } from "@/components/ui/CtaBand";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { jobsCta, jobsHero, jobsMeta } from "@/content/jobs";
import { getJobs } from "@/lib/jobs";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. An empty board is a real page with real content,
// not a coming-soon stub. See CLAUDE.md, rule 4.
export const metadata: Metadata = buildMetadata({
  title: jobsMeta.title,
  description: jobsMeta.description,
  path: "/jobs",
});

/**
 * The job board.
 *
 * NO JSON-LD ON THIS PAGE. Not an ItemList, not a JobPosting, nothing. With
 * an empty board there is nothing to describe, and an ItemList of nothing is
 * a structured-data claim that we have listings when we do not. The
 * JobPosting markup belongs on the posting itself - see jobs/[slug]/page.tsx
 * - and `npm run check:seo` asserts that this page emits none.
 *
 * Everything here reads from getJobs(). When it starts returning postings,
 * the filter UI and the cards appear with no change to this file.
 */
export default async function Page() {
  const jobs = await getJobs();

  return (
    <>
      <PageHeader
        eyebrow={jobsHero.eyebrow}
        heading={jobsHero.heading}
        intro={jobsHero.intro}
      />

      <Container>
        <div className="py-14 sm:py-16 lg:py-20">
          {jobs.length > 0 ? <JobBoard jobs={jobs} /> : <EmptyBoard />}
        </div>
      </Container>

      <CtaBand content={jobsCta} headingId="jobs-cta-heading" />
    </>
  );
}
