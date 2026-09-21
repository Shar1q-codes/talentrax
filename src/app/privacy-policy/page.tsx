import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalContentsLabel, legalMeta, privacyPolicy } from "@/content/legal";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 4.
export const metadata: Metadata = buildMetadata({
  title: legalMeta.privacy.title,
  description: legalMeta.privacy.description,
  path: "/privacy-policy",
});

/**
 * Privacy policy.
 *
 * The "what we collect" and "consent" sections are derived from the live form
 * definitions, so they cannot drift from the forms. Everything this repo
 * cannot know - retention, processors, the data-rights contact, transfers -
 * is absent rather than approximated, and is a numbered question in
 * CLIENT-CONFIRM.md. See the header of content/legal.ts.
 */
export default function Page() {
  return (
    <LegalDocument content={privacyPolicy} contentsLabel={legalContentsLabel} />
  );
}
