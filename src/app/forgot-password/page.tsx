import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  forgotPassword,
  forgotPasswordMeta,
  notOpenYet,
} from "@/content/auth";
import { buildMetadata } from "@/lib/metadata";

/**
 * Exists so the sign-in page has no dangling link.
 *
 * NOINDEX AND ABSENT FROM THE SITEMAP. See the note on /login. A password
 * reset page in search results is an invitation to a stranger and of no use
 * to anyone who actually has an account.
 */
export const metadata: Metadata = buildMetadata({
  title: forgotPasswordMeta.title,
  description: forgotPasswordMeta.description,
  path: "/forgot-password",
  noIndex: true,
});

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={forgotPassword.eyebrow}
        heading={forgotPassword.heading}
        intro={forgotPassword.intro}
      >
        {/* Removed when auth is wired. See content/auth.ts. */}
        <p className="mt-6 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted">
          {notOpenYet.forgotPassword}
        </p>
      </PageHeader>

      <Container>
        <div className="max-w-xl py-14 sm:py-16 lg:py-20">
          <ForgotPasswordForm />
        </div>
      </Container>
    </>
  );
}
