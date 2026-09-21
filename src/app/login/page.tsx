import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/SignInForm";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { login, loginMeta, notOpenYet } from "@/content/auth";
import { buildMetadata } from "@/lib/metadata";

/**
 * NOINDEX AND ABSENT FROM THE SITEMAP, unlike every other built route.
 *
 * "Built" and "indexable" come apart here for the first time. The page is
 * real, but it signs nobody in, so it has no business in search results and
 * it is not linked from the header or the drawer either - see CLAUDE.md,
 * "The account screens". Reachable by typing the URL, which is all it needs
 * to be until the backend exists.
 */
export const metadata: Metadata = buildMetadata({
  title: loginMeta.title,
  description: loginMeta.description,
  path: "/login",
  noIndex: true,
});

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={login.eyebrow}
        heading={login.heading}
        intro={login.intro}
      >
        {/*
          The account links are in the navigation while the backend is not
          built, so the page says plainly what this form can and cannot do
          before anyone types a password into it. Removed when auth is wired.
        */}
        <p className="mt-6 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted">
          {notOpenYet.login}
        </p>
      </PageHeader>

      <Container>
        <div className="max-w-xl py-14 sm:py-16 lg:py-20">
          <SignInForm />
        </div>
      </Container>
    </>
  );
}
