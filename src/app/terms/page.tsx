import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalContentsLabel, legalMeta, termsOfUse } from "@/content/legal";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: legalMeta.terms.title,
  description: legalMeta.terms.description,
  path: "/terms",
});

/**
 * Website terms of use. Website only.
 *
 * Nothing here is client-engagement terms: no fees, no guarantees, no service
 * commitments. That is a signed agreement between two parties, and a page
 * anyone can edit is the wrong place for it. The scope note on the page says
 * so out loud so neither side can read this as the contract.
 */
export default function Page() {
  return (
    <LegalDocument content={termsOfUse} contentsLabel={legalContentsLabel} />
  );
}
