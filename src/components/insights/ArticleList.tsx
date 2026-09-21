import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { articleList } from "@/content/insights";
import type { Article } from "@/lib/insights";
import { formatPostedDate } from "@/lib/jobs-format";

/**
 * The article index, once there is something to index.
 *
 * Renders only when there is at least one article; the empty state is
 * EmptyInsights.tsx. There are no category or tag filters: filters over
 * nothing are worse than no filters, and there is no taxonomy to filter by
 * until articles exist to suggest one.
 *
 * A card carries a title, a date and a standfirst. No author - the Article
 * type has no such field (see lib/insights.ts) - and no reading time or view
 * count, both of which are numbers the content rules forbid and both of which
 * were torn out of the home page teaser once already.
 *
 * Server component: nothing here is interactive.
 */
export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <div>
      <p className="text-base font-semibold text-ink">
        {articles.length === 1
          ? articleList.countLabelOne
          : `${articles.length} ${articleList.countLabelMany}`}
      </p>

      <ul className="mt-6 flex flex-col gap-6">
        {articles.map((article) => (
          <Card as="li" key={article.id} className="flex flex-col">
            <p className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
              {articleList.publishedLabel}{" "}
              <time dateTime={article.datePublished}>
                {formatPostedDate(article.datePublished)}
              </time>
            </p>

            <h3 className="mt-3 text-xl font-bold text-ink">
              <Link
                href={`/insights/${article.slug}`}
                className="no-underline transition-colors hover:text-brand hover:underline hover:underline-offset-4"
              >
                {article.title}
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </h3>

            <p className="mt-3 text-base text-ink-muted">
              {article.standfirst}
            </p>
          </Card>
        ))}
      </ul>
    </div>
  );
}
