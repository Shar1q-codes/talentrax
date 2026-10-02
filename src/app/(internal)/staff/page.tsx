import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StaffSignOutButton } from "@/features/auth";
import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { STAFF_INBOX_PATH } from "@/content/inbox";
import { STAFF_HOME_PATH, STAFF_RESUME_FORM_PATH, staffHome, staffMeta } from "@/content/staff";
import { ButtonLink } from "@/components/ui/Button";
import { buildMetadata } from "@/lib/metadata";

/**
 * The staff area, for a staff account past both steps. Nothing else gets
 * here: anyone short of aal2 is sent to the step they are on. The database
 * holds the same line on its own (migration 14).
 *
 */
export const metadata: Metadata = buildMetadata({
  title: staffMeta.home.title,
  description: staffMeta.home.description,
  path: STAFF_HOME_PATH,
  noIndex: true,
});

export default async function Page() {
  const access = await getStaffAccess();
  if (access.state !== "signed_in") redirect(staffPathFor(access));

  return (
    <>
      <PageHeader
        eyebrow={staffHome.eyebrow}
        heading={staffHome.heading}
        intro={staffHome.signedInAs(access.displayName)}
      />
      <Container>
        <div className="flex max-w-xl flex-col gap-8 py-14 sm:py-16 lg:py-20">
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={STAFF_INBOX_PATH}>{staffHome.inboxLabel}</ButtonLink>
            <ButtonLink href={STAFF_RESUME_FORM_PATH} variant="secondary">{staffHome.resumeFormLabel}</ButtonLink>
            <StaffSignOutButton />
          </div>
        </div>
      </Container>
    </>
  );
}
