import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/insights/ArticleBody";
import { ArticleModal } from "@/components/insights/ArticleModal";
import { articleDetail, INSIGHTS_PATH } from "@/content/insights";
import {
  getArticleBySlug,
  getArticles,
  getRelatedArticles,
} from "@/lib/insights";
import { formatPostedDate } from "@/lib/jobs-format";
import { buildMetadata } from "@/lib/metadata";

/**
 * /insights/[slug], intercepted from the index into a dialog.
 *
 * Reached only by a soft navigation from /insights (see the layout one
 * level up for why nowhere else intercepts). The URL still changes to
 * /insights/<slug>, so it can be shared, and back closes the dialog. A hard
 * visit to the same URL renders app/insights/[slug]/page.tsx, the full
 * page, which is where the structured data lives; this route emits none,
 * because a crawler never sees it.
 *
 * The article content is a server component passed into the client dialog
 * as children, so nothing about the article is shipped as client JavaScript.
 */

const TITLE_ID = "article-modal-title";

/** Prerendered for every article, like the full page, so nothing here
 *  needs a server at request time. */
export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return buildMetadata({
    title: article.metaTitle,
    description: article.metaDescription,
    path: `${INSIGHTS_PATH}/${article.slug}`,
  });
}

export default async function InterceptedArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const related = await getRelatedArticles(article);
  const wasEdited = article.dateModified !== article.datePublished;

  return (
    <ArticleModal slug={article.slug} titleId={TITLE_ID}>
      <header>
        <h2
          id={TITLE_ID}
          className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
        >
          {article.title}
        </h2>
        <p className="mt-4 text-lg text-ink-muted">{article.summary}</p>
        <p className="mt-6 text-sm font-semibold tracking-widest text-ink-muted uppercase">
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
      </header>

      <div className="mt-10">
        <ArticleBody article={article} related={related} base={3} idPrefix="modal" />
      </div>
    </ArticleModal>
  );
}
