import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/insights/ArticleBody";
import { TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { articleDetail, INSIGHTS_PATH } from "@/content/insights";
import { SITE_URL, site } from "@/content/site";
import { blogPostingJsonLd } from "@/lib/article-schema";
import { faqPageJsonLdFromItems } from "@/lib/faq-schema";
import {
  getArticleBySlug,
  getArticles,
  getRelatedArticles,
} from "@/lib/insights";
import { formatPostedDate } from "@/lib/jobs-format";
import { buildMetadata } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/seo";

/**
 * One article, as a full page.
 *
 * THIS IS WHAT A CRAWLER, A SHARED LINK, A REFRESH AND A DIRECT VISIT GET.
 * The same URL opened from a card on /insights is intercepted into a modal
 * (see app/insights/(index)/@modal), but that only happens on a soft
 * navigation from the index. This page is the canonical, indexable
 * document, and it renders the whole article with its structured data.
 *
 * `generateStaticParams` maps over `getArticles()`, so there is one page per
 * imported article and none for anything else. An unknown slug is a 404.
 *
 * NO BYLINE. The Article type has no author field and nothing here renders
 * one. Nobody has been named anywhere on this site.
 *
 * STRUCTURED DATA. One BlogPosting per article, and one FAQPage when the
 * article has an FAQ section - generated from the same array the section
 * renders, so the markup cannot say anything the page does not. An article
 * without FAQs emits no FAQPage at all.
 */

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

/**
 * Metadata for a slug with no article behind it. Not rendered - the page
 * calls notFound() - but generateMetadata runs first and has to return
 * something, and that something must not be indexable.
 */
const notFoundTitle = "Article not found";
const notFoundDescription =
  "This article is not published. Browse the insights index instead.";

export async function generateMetadata({
  params,
}: PageProps<"/insights/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return buildMetadata({
      title: notFoundTitle,
      description: notFoundDescription,
      path: `${INSIGHTS_PATH}/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: article.metaTitle,
    description: article.metaDescription,
    path: `${INSIGHTS_PATH}/${article.slug}`,
  });
}

export default async function Page({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const related = await getRelatedArticles(article);

  const blogPosting = serializeJsonLd(
    blogPostingJsonLd(article, { name: site.name, siteUrl: SITE_URL }),
  );
  const faqPage =
    article.faqs.length > 0
      ? serializeJsonLd(faqPageJsonLdFromItems(article.faqs))
      : null;

  const wasEdited = article.dateModified !== article.datePublished;

  return (
    <>
      <script
        type="application/ld+json"
        // Payload is escaped in serializeJsonLd(); "<" cannot break out.
        dangerouslySetInnerHTML={{ __html: blogPosting }}
      />
      {faqPage ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqPage }}
        />
      ) : null}

      <PageHeader
        eyebrow={articleDetail.eyebrow}
        heading={article.title}
        intro={article.summary}
      >
        <p className="mt-8 text-sm font-semibold tracking-widest text-ink-muted uppercase">
          {articleDetail.publishedLabel}{" "}
          <time dateTime={article.datePublished}>
            {formatPostedDate(article.datePublished)}
          </time>
          {wasEdited ? (
            <>
              {" - "}
              {articleDetail.updatedLabel}{" "}
              <time dateTime={article.dateModified}>
                {formatPostedDate(article.dateModified)}
              </time>
            </>
          ) : null}
        </p>
      </PageHeader>

      <Container>
        <div className="max-w-3xl py-14 sm:py-16 lg:py-20">
          <ArticleBody article={article} related={related} base={2} idPrefix="article" />

          <p className="mt-12 border-t border-border pt-8 text-base">
            <TextLink href={INSIGHTS_PATH}>{articleDetail.backLabel}</TextLink>
          </p>
        </div>
      </Container>
    </>
  );
}
