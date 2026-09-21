import type { Metadata } from "next";

import {
  CommercialTermsNote,
  ServiceDetails,
  ServicesAnchorNav,
} from "@/components/employers/ServiceDetails";
import { ButtonLink } from "@/components/ui/Button";
import { CtaBand } from "@/components/ui/CtaBand";
import { PageHeader } from "@/components/ui/PageHeader";
import { employersMeta, servicesCta, servicesPage } from "@/content/employers";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: employersMeta.services.title,
  description: employersMeta.services.description,
  path: "/employers/services",
});

/**
 * The five engagement models in detail, one anchored section each. The cards
 * on /employers link straight into these ids, so they are part of the URL
 * contract and should not be renamed casually.
 *
 * Fees, rates and guarantee periods are not published: every unconfirmed
 * commercial point renders the [COMMERCIAL TERMS] marker instead.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={servicesPage.eyebrow}
        heading={servicesPage.heading}
        intro={servicesPage.intro}
      >
        <CommercialTermsNote />
        <ServicesAnchorNav />
        <div className="mt-8">
          <ButtonLink
            href={servicesPage.cta.href}
            variant={servicesPage.cta.variant}
          >
            {servicesPage.cta.label}
          </ButtonLink>
        </div>
      </PageHeader>

      <ServiceDetails />

      <CtaBand content={servicesCta} headingId="services-cta-heading" />
    </>
  );
}
