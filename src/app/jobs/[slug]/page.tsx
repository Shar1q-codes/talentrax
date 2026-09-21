import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { board, jobDetail, JOBS_PATH } from "@/content/jobs";
import { deskName, engagementName, specialtyName } from "@/content/taxonomy";
import { SITE_URL, site } from "@/content/site";
import { jobPostingJsonLd } from "@/lib/job-posting-schema";
import { getJobBySlug, getJobs, isExpired } from "@/lib/jobs";
import {
  formatLocation,
  formatPayRange,
  formatPostedDate,
} from "@/lib/jobs-format";
import { buildMetadata } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/seo";

/**
 * One job posting.
 *
 * THIS ROUTE PRODUCES ZERO PAGES TODAY. `generateStaticParams` maps over
 * `getJobs()`, which returns nothing, so the build emits no /jobs/* pages and
 * no JobPosting structured data exists anywhere in the output. When jobs are
 * real, the same code emits one page each with no edit.
 *
 * EXPIRED POSTINGS. A posting past `validThrough` must answer 410 Gone - not
 * 404, and never a redirect, because Google treats a 410 as the definitive
 * "this job is gone" signal and anything softer leaves it in the index. A
 * page component cannot set a status code in Next, so the 410 is served at
 * the edge from `getRecentlyExpiredSlugs()`. What this file does is make sure
 * an expired posting never gets a page in the first place:
 * `generateStaticParams` filters them out. See CLAUDE.md, "Expired job
 * postings", for the whole mechanism and what is still to wire up.
 */

export async function generateStaticParams() {
  const jobs = await getJobs();
  // An expired posting must not get a static page. If one is still coming
  // back from the source, that is a fault upstream - the fix is not to
  // publish it anyway.
  return jobs
    .filter((job) => !isExpired(job))
    .map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    return buildMetadata({
      title: jobsNotFoundTitle,
      description: jobsNotFoundDescription,
      path: `${JOBS_PATH}/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: job.title,
    description: job.description[0] ?? job.title,
    path: `${JOBS_PATH}/${job.slug}`,
  });
}

/**
 * Metadata for a slug with no posting behind it. Not rendered - the page
 * calls notFound() - but generateMetadata runs first and has to return
 * something, and that something must not be indexable.
 */
const jobsNotFoundTitle = "Role not found";
const jobsNotFoundDescription =
  "This role is no longer listed. Browse the open roles instead.";

export default async function Page({ params }: PageProps<"/jobs/[slug]">) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job || isExpired(job)) {
    // 404 for a slug that never existed. An EXPIRED posting should be a 410,
    // which a page component cannot return - the edge layer handles that, and
    // this is the backstop for a posting that expired between builds.
    notFound();
  }

  const jsonLd = serializeJsonLd(
    jobPostingJsonLd(job, { name: site.name, siteUrl: SITE_URL }),
  );

  const meta = [
    { id: "location", label: board.metaLabels.location, value: `${formatLocation(job.location)} - ${board.workModeLabels[job.location.workMode] ?? job.location.workMode}` },
    { id: "pay", label: board.metaLabels.pay, value: formatPayRange(job.pay, board.payUnitLabels[job.pay.unit] ?? job.pay.unit) },
    { id: "engagement", label: board.metaLabels.engagement, value: engagementName(job.engagementId) },
    { id: "desk", label: board.metaLabels.desk, value: deskName(job.deskId) },
    { id: "specialty", label: board.metaLabels.specialty, value: specialtyName(job.deskId, job.specialtyId) },
    { id: "posted", label: board.metaLabels.posted, value: formatPostedDate(job.datePosted) },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // Payload is escaped in serializeJsonLd(); "<" cannot break out.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <PageHeader eyebrow={jobDetail.eyebrow} heading={job.title}>
        <dl className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {meta.map((row) => (
            <div key={row.id}>
              <dt className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                {row.label}
              </dt>
              <dd className="mt-1 text-base text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <ButtonLink href={jobDetail.applyHref} variant="primary" size="lg">
            {jobDetail.applyLabel}
          </ButtonLink>
        </div>
      </PageHeader>

      <Container>
        <div className="max-w-3xl py-14 sm:py-16 lg:py-20">
          <section aria-labelledby="job-description-heading">
            <h2
              id="job-description-heading"
              className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {jobDetail.headings.description}
            </h2>
            {job.description.map((paragraph) => (
              <p key={paragraph} className="mt-5 text-base text-ink-muted">
                {paragraph}
              </p>
            ))}
          </section>

          {job.responsibilities.length > 0 ? (
            <section
              aria-labelledby="job-responsibilities-heading"
              className="mt-12"
            >
              <h2
                id="job-responsibilities-heading"
                className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              >
                {jobDetail.headings.responsibilities}
              </h2>
              <ul className="mt-5 flex flex-col gap-2 border-l-2 border-border pl-5">
                {job.responsibilities.map((item) => (
                  <li key={item} className="text-base text-ink-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {job.requirements.length > 0 ? (
            <section aria-labelledby="job-requirements-heading" className="mt-12">
              <h2
                id="job-requirements-heading"
                className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              >
                {jobDetail.headings.requirements}
              </h2>
              <ul className="mt-5 flex flex-col gap-2 border-l-2 border-border pl-5">
                {job.requirements.map((item) => (
                  <li key={item} className="text-base text-ink-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-12 border-t border-border pt-8">
            <ButtonLink href={jobDetail.applyHref} variant="primary" size="lg">
              {jobDetail.applyLabel}
            </ButtonLink>
            <p className="mt-4 text-base text-ink-muted">
              {jobDetail.applyNote}
            </p>
            <p className="mt-6 text-base">
              <TextLink href={JOBS_PATH}>{jobDetail.backLabel}</TextLink>
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
