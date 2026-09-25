import type { Metadata } from "next";

import { ArticleList } from "@/components/insights/ArticleList";
import { EmptyInsights } from "@/components/insights/EmptyInsights";
import { Container } from "@/components/ui/Container";
import { CtaBand } from "@/components/ui/CtaBand";
import { PageHeader } from "@/components/ui/PageHeader";
import { insightsCta, insightsHero, insightsMeta } from "@/content/insights";
import { getArticles } from "@/lib/insights";
import { buildMetadata } from "@/lib/metadata";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. An empty index is a real page with real content,
// not a coming-soon stub. See CLAUDE.md, rule 5.
export const metadata: Metadata = buildMetadata({
  title: insightsMeta.title,
  description: insightsMeta.description,
  path: "/insights",
});

/**
 * The insights index.
 *
 * NO JSON-LD ON THIS PAGE. Not an ItemList, not a Blog, nothing. The
 * BlogPosting and FAQPage markup belongs on the article - see
 * insights/[slug]/page.tsx - and `npm run check:seo` asserts that this page
 * emits none.
 *
 * Everything reads from getArticles(). The list renders when it returns
 * articles and the empty state when it does not; both branches are real.
 */
export default async function Page() {
  const articles = await getArticles();

  return (
    <>
      <PageHeader
        eyebrow={insightsHero.eyebrow}
        heading={insightsHero.heading}
        intro={insightsHero.intro}
      />

      <Container>
        <div className="py-14 sm:py-16 lg:py-20">
          {articles.length > 0 ? (
            <ArticleList articles={articles} />
          ) : (
            <EmptyInsights />
          )}
        </div>
      </Container>

      <CtaBand content={insightsCta} headingId="insights-cta-heading" />
    </>
  );
}
