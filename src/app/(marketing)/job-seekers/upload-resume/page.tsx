import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UploadResumeForm } from "@/features/job-seekers";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { NotOpenNotice } from "@/components/ui/NotOpenNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { jobSeekersMeta } from "@/content/job-seekers";
import { uploadResume } from "@/content/upload-resume";
import { buildMetadata } from "@/lib/metadata";
import { resumeFormOpenToPublic, resumeRoutePublic } from "@/lib/supabase/forms-gate";

export const metadata: Metadata = buildMetadata({
  title: jobSeekersMeta.uploadResume.title,
  description: jobSeekersMeta.uploadResume.description,
  path: "/job-seekers/upload-resume",
  // The release gate in CLIENT-CONFIRM.md: not publicly reachable until the
  // privacy items are answered. The route stays, unlinked from every page,
  // out of the sitemap, and noindex - the account screens' treatment.
  noIndex: true,
});

/**
 * The resume upload page. The page itself is a server component: only the
 * form below is a client component, so the h1, the intro and the metadata are
 * all in the server-rendered HTML.
 *
 * THE RELEASE GATE (CLIENT-CONFIRM.md, and RESUME_PUBLIC_RELEASE in
 * src/lib/supabase/forms-gate.ts). In production, until it clears, this
 * route is a 404 for everyone: not publicly reachable, as the gate says. The
 * same form is at /staff/upload-resume for signed-in staff. Elsewhere it
 * renders, unlisted and noindex, and the forms gate decides whether it is
 * open. Opening it to the public is a release step, not a cleanup.
 */
export default function Page() {
  if (!resumeRoutePublic()) notFound();
  const open = resumeFormOpenToPublic();
  return (
    <>
      <PageHeader
        eyebrow={uploadResume.eyebrow}
        heading={uploadResume.heading}
        intro={uploadResume.intro}
      >
        {open ? null : <NotOpenNotice>{uploadResume.notOpen.notice}</NotOpenNotice>}
        <ul className="mt-8 flex flex-col gap-2">
          {uploadResume.beforeYouStart.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-base text-ink-muted"
            >
              <Icon name="check" className="mt-1.5 h-4 w-4 shrink-0 text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </PageHeader>

      <Container>
        <div className="max-w-3xl py-14 sm:py-16 lg:py-20">
          <UploadResumeForm open={open} />
        </div>
      </Container>
    </>
  );
}
