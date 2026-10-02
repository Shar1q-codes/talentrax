import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StaffSignInForm } from "@/features/auth";
import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { Container } from "@/components/ui/Container";
import { NotOpenNotice } from "@/components/ui/NotOpenNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { STAFF_SIGN_IN_PATH, staffMeta, staffSignIn, staffUnavailable } from "@/content/staff";
import { buildMetadata } from "@/lib/metadata";

/**
 * Staff sign-in, step one: email and password.
 *
 * NOINDEX, ABSENT FROM THE SITEMAP AND LINKED FROM NOTHING. Staff reach it by
 * its address. check:seo's UNLISTED_ROUTES asserts all three.
 *
 * Someone already part-way through, or signed in, is sent to where they
 * belong (staffPathFor).
 */
export const metadata: Metadata = buildMetadata({
  title: staffMeta.signIn.title,
  description: staffMeta.signIn.description,
  path: STAFF_SIGN_IN_PATH,
  noIndex: true,
});

export default async function Page() {
  const access = await getStaffAccess();
  const belongs = staffPathFor(access);
  if (belongs !== STAFF_SIGN_IN_PATH) redirect(belongs);

  return (
    <>
      <PageHeader eyebrow={staffSignIn.eyebrow} heading={staffSignIn.heading} intro={staffSignIn.intro}>
        {access.state === "unavailable" ? <NotOpenNotice>{staffUnavailable}</NotOpenNotice> : null}
      </PageHeader>
      {access.state === "unavailable" ? null : (
        <Container>
          <div className="max-w-xl py-14 sm:py-16 lg:py-20">
            <StaffSignInForm />
          </div>
        </Container>
      )}
    </>
  );
}
