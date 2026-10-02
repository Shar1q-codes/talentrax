import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StaffEnrolment, StaffSignOutButton } from "@/features/auth";
import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { STAFF_SET_UP_PATH, staffMeta, staffSetUp } from "@/content/staff";
import { buildMetadata } from "@/lib/metadata";

/**
 * First staff sign-in: setting up the authenticator. Only for a staff
 * account that has passed its password and has no app set up. A lost phone
 * is not a way back here: an administrator resets the factor by the runbook
 * in supabase/STAFF-ACCESS.md, and only then does this page reappear.
 */
export const metadata: Metadata = buildMetadata({
  title: staffMeta.setUp.title,
  description: staffMeta.setUp.description,
  path: STAFF_SET_UP_PATH,
  noIndex: true,
});

export default async function Page() {
  const belongs = staffPathFor(await getStaffAccess());
  if (belongs !== STAFF_SET_UP_PATH) redirect(belongs);

  return (
    <>
      <PageHeader eyebrow={staffSetUp.eyebrow} heading={staffSetUp.heading} intro={staffSetUp.intro} />
      <Container>
        <div className="flex max-w-xl flex-col gap-10 py-14 sm:py-16 lg:py-20">
          <StaffEnrolment />
          <StaffSignOutButton label={staffSetUp.startOver} />
        </div>
      </Container>
    </>
  );
}
