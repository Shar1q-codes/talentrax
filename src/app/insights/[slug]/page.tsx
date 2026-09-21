import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { articleDetail, INSIGHTS_PATH } from "@/content/insights";
import { SITE_URL, site } from "@/content/site";
import { blogPostingJsonLd } from "@/lib/article-schema";
import { getArticleBySlug, getArticles } from "@/lib/insights";
import { formatPostedDate } from "@/lib/jobs-format";
import { buildMetadata } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/seo";

/**
 * One article.
 *
 * THIS ROUTE PRODUCES ZERO PAGES TODAY. `generateStaticParams` maps over
 * `getArticles()`, which returns nothing, so the build emits no /insights/*
 * pages and no BlogPosting structured data exists anywhere in the output.
 * When articles are real, the same code emits one page each with no edit.
 *
 * NO BYLINE. The Article type has no author field and nothing here renders
 * one. Nobody has been named anywhere on this site.
 *
 * The body is structured blocks, not an HTML string, so nothing on this page
 * is ever handed untrusted markup to render.
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
    title: article.title,
    description: article.standfirst,
    path: `${INSIGHTS_PATH}/${article.slug}`,
  });
}

export default async function Page({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const jsonLd = serializeJsonLd(
    blogPostingJsonLd(article, { name: site.name, siteUrl: SITE_URL }),
  );

  const wasEdited = article.dateModified !== article.datePublished;

  return (
    <>
      <script
        type="application/ld+json"
        // Payload is escaped in serializeJsonLd(); "<" cannot break out.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <PageHeader
        eyebrow={articleDetail.eyebrow}
        heading={article.title}
        intro={article.standfirst}
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
          {article.body.map((block, index) => {
            // Blocks have no ids of their own: they are positional content
            // from a CMS, so the index is the only stable key available.
            const key = `${block.kind}-${index}`;

            if (block.kind === "heading") {
              return (
                <h2
                  key={key}
                  className="mt-12 text-2xl font-bold tracking-tight text-ink first:mt-0 sm:text-3xl"
                >
                  {block.text}
                </h2>
              );
            }

            if (block.kind === "list") {
              return (
                <ul
                  key={key}
                  className="mt-5 flex flex-col gap-2 border-l-2 border-border pl-5"
                >
                  {block.items.map((item) => (
                    <li key={item} className="text-base text-ink-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }

            return (
              <p key={key} className="mt-5 text-base text-ink-muted first:mt-0">
                {block.text}
              </p>
            );
          })}

          <p className="mt-12 border-t border-border pt-8 text-base">
            <TextLink href={INSIGHTS_PATH}>{articleDetail.backLabel}</TextLink>
          </p>
        </div>
      </Container>
    </>
  );
}
