import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { UploadResumeForm } from "@/features/job-seekers";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { NotOpenNotice } from "@/components/ui/NotOpenNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { STAFF_HOME_PATH, STAFF_RESUME_FORM_PATH, staffMeta, staffResumeForm } from "@/content/staff";
import { uploadResume } from "@/content/upload-resume";
import { buildMetadata } from "@/lib/metadata";
import { resumeFormOpenToStaff } from "@/lib/supabase/forms-gate";

/**
 * The resume form behind staff sign-in. The release gate keeps the public
 * page a 404 in production (src/lib/supabase/forms-gate.ts); this is the
 * same form, for staff past both sign-in steps, so the production path can
 * be tried before the public can reach it.
 *
 * Its upload endpoints are server actions, which post to this page: the
 * staff session cookie (scoped to /staff) comes with them, and they check it
 * themselves (features/job-seekers/actions.ts).
 */
export const metadata: Metadata = buildMetadata({
  title: staffMeta.resumeForm.title,
  description: staffMeta.resumeForm.description,
  path: STAFF_RESUME_FORM_PATH,
  noIndex: true,
});

export default async function Page() {
  const access = await getStaffAccess();
  if (access.state !== "signed_in") redirect(staffPathFor(access));
  const open = resumeFormOpenToStaff();

  return (
    <>
      <PageHeader eyebrow={staffResumeForm.eyebrow} heading={staffResumeForm.heading} intro={staffResumeForm.intro}>
        {open ? null : <NotOpenNotice>{uploadResume.notOpen.notice}</NotOpenNotice>}
      </PageHeader>
      <Container>
        <div className="flex max-w-3xl flex-col gap-10 py-14 sm:py-16 lg:py-20">
          <UploadResumeForm open={open} />
          <div>
            <ButtonLink href={STAFF_HOME_PATH} variant="secondary">
              {staffResumeForm.backLabel}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
