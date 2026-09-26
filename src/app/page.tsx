import type { Metadata } from "next";

import { ClosingCta } from "@/components/home/ClosingCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LatestArticles } from "@/components/home/LatestArticles";
import { Services } from "@/components/home/Services";
import { Specialties } from "@/components/home/Specialties";
import { SplitSection } from "@/components/home/SplitSection";
import { latestArticles } from "@/content/home";
import { site } from "@/content/site";
import { getArticles } from "@/lib/insights";
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
 * Section order: hero, services, specialties, split, latest articles, how
 * it works, closing CTA. Header and Footer come from the root layout.
 * Tones from specialties down alternate muted, default, muted, default,
 * brand. The rail cannot sit directly after specialties: it would then
 * border the split section, and one of the two neighbours would share its
 * tone whichever it took.
 *
 * The latest-articles rail shows the first few real imported articles from
 * getArticles(), in the explicit order of content/article-order.ts - never
 * by date, which is one import date for all of them. There were three
 * invented article cards here once; the rail renders nothing if there are
 * no articles, and never a placeholder.
 *
 * JSON-LD (Organization + WebSite) is emitted here only. This is a server
 * component, so the script tag is in the initial HTML - no client JS needed
 * for a crawler to read it.
 */
export default async function HomePage() {
  const articles = (await getArticles()).slice(0, latestArticles.limit);
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
      <LatestArticles articles={articles} />
      <HowItWorks />
      <ClosingCta />
    </>
  );
}
