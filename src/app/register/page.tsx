import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { notOpenYet, register, registerMeta } from "@/content/auth";
import { buildMetadata } from "@/lib/metadata";

/**
 * Candidate accounts only. Employer accounts are created by the Talentrax
 * team, so this page explains that rather than offering an account-type
 * selector - a self-service route to an employer account is a privilege
 * question, not a form field.
 *
 * NOINDEX AND ABSENT FROM THE SITEMAP. See the note on /login.
 */
export const metadata: Metadata = buildMetadata({
  title: registerMeta.title,
  description: registerMeta.description,
  path: "/register",
  noIndex: true,
});

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={register.eyebrow}
        heading={register.heading}
        intro={register.intro}
      >
        {/* Removed when auth is wired. See content/auth.ts. */}
        <p className="mt-6 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted">
          {notOpenYet.register}
        </p>

        <p className="mt-4 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted">
          {register.employerNotice}{" "}
          <Link
            href={register.employerLinkHref}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {register.employerLinkLabel}
          </Link>
          .
        </p>
      </PageHeader>

      <Container>
        <div className="max-w-xl py-14 sm:py-16 lg:py-20">
          <RegisterForm />
        </div>
      </Container>
    </>
  );
}
