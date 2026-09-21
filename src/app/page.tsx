import type { Metadata } from "next";

import { ClosingCta } from "@/components/home/ClosingCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Services } from "@/components/home/Services";
import { Specialties } from "@/components/home/Specialties";
import { SplitSection } from "@/components/home/SplitSection";
import { site } from "@/content/site";
import { buildMetadata } from "@/lib/metadata";
import { organizationJsonLd, serializeJsonLd, webSiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: site.tagline,
    description: site.description,
    path: "/",
  }),
  // The home page keeps the full site name rather than the "%s | site" template.
  title: `${site.name} | ${site.tagline}`,
};

/**
 * The only fully built route. Section order matches the brief:
 * hero, services, specialties, split, how it works, closing CTA. Header and
 * Footer come from the root layout.
 *
 * There is no insights section. There were three placeholder article cards
 * here, which is fabricated content on the one page guaranteed to be indexed
 * (rule 6). A home page does not get an insights section until there are
 * articles to put in it.
 *
 * JSON-LD (Organization + WebSite) is emitted here only. This is a server
 * component, so the script tag is in the initial HTML - no client JS needed
 * for a crawler to read it.
 */
export default function HomePage() {
  const jsonLd = serializeJsonLd([organizationJsonLd(), webSiteJsonLd()]);

  return (
    <>
      <script
        type="application/ld+json"
        // Payload is escaped in serializeJsonLd(); "<" cannot break out.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero />
      <Services />
      <Specialties />
      <SplitSection />
      <HowItWorks />
      <ClosingCta />
    </>
  );
}
