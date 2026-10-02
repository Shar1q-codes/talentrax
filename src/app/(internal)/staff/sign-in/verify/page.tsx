import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StaffSignOutButton, StaffVerifyForm } from "@/features/auth";
import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { STAFF_VERIFY_PATH, staffMeta, staffVerify } from "@/content/staff";
import { buildMetadata } from "@/lib/metadata";

/**
 * Staff sign-in, step two: the code from the authenticator. Only for a
 * staff account that has passed its password and has an app set up; anyone
 * else is sent where they belong.
 */
export const metadata: Metadata = buildMetadata({
  title: staffMeta.verify.title,
  description: staffMeta.verify.description,
  path: STAFF_VERIFY_PATH,
  noIndex: true,
});

export default async function Page() {
  const belongs = staffPathFor(await getStaffAccess());
  if (belongs !== STAFF_VERIFY_PATH) redirect(belongs);

  return (
    <>
      <PageHeader eyebrow={staffVerify.eyebrow} heading={staffVerify.heading} intro={staffVerify.intro} />
      <Container>
        <div className="flex max-w-xl flex-col gap-10 py-14 sm:py-16 lg:py-20">
          <StaffVerifyForm />
          <StaffSignOutButton label={staffVerify.startOver} />
        </div>
      </Container>
    </>
  );
}
