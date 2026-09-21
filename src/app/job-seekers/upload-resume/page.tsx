import type { Metadata } from "next";

import { UploadResumeForm } from "@/components/job-seekers/UploadResumeForm";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { jobSeekersMeta } from "@/content/job-seekers";
import { uploadResume } from "@/content/upload-resume";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: jobSeekersMeta.uploadResume.title,
  description: jobSeekersMeta.uploadResume.description,
  path: "/job-seekers/upload-resume",
});

/**
 * The resume upload page. The page itself is a server component: only the
 * form below is a client component, so the h1, the intro and the metadata are
 * all in the server-rendered HTML.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={uploadResume.eyebrow}
        heading={uploadResume.heading}
        intro={uploadResume.intro}
      >
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
          <UploadResumeForm />
        </div>
      </Container>
    </>
  );
}
