import type { Metadata } from "next";

import { LegalDocument } from "@/components/marketing/legal/LegalDocument";
import { buildPrivacyPolicy, legalContentsLabel, legalMeta } from "@/content/legal";
import { buildMetadata } from "@/lib/metadata";
import { publicFormsOpen } from "@/lib/supabase/forms-gate";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 5.
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
 *
 * Where form submissions are stored is said when, and only when, the forms
 * gate says the forms are open: the same build-time answer the forms use.
 */
export default function Page() {
  const content = buildPrivacyPolicy({ formsStored: publicFormsOpen() });
  return <LegalDocument content={content} contentsLabel={legalContentsLabel} />;
}
