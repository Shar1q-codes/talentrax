import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { articleList } from "@/content/insights";
import type { Article } from "../queries";

/**
 * The article index, once there is something to index.
 *
 * Renders only when there is at least one article; the empty state is
 * EmptyInsights.tsx and still works if the source is ever empty again. There are no category or tag filters: filters over
 * nothing are worse than no filters, and there is no taxonomy to filter by
 * until articles exist to suggest one.
 *
 * A card carries a title and the summary. No date - the dates in the data
 * are import timestamps, not publication dates (see CLAUDE.md, "The
 * insights index"). No author - the Article type has no such field (see
 * features/articles/queries.ts) - and no reading time or view count, both of which are
 * numbers the content rules forbid and both of which were torn out of the
 * home page teaser once already.
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
            <h3 className="text-xl font-bold text-ink">
              <Link
                href={`/insights/${article.slug}`}
                // From the index this navigation is intercepted into the
                // article modal (see app/(marketing)/insights/(index)/@modal). The list
                // stays where it is underneath, so the router must not
                // scroll it; back then returns to the same position.
                scroll={false}
                className="no-underline transition-colors hover:text-brand hover:underline hover:underline-offset-4 active:text-brand-strong"
              >
                {article.title}
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </h3>

            <p className="mt-3 text-base text-ink-muted">
              {article.summary}
            </p>
          </Card>
        ))}
      </ul>
    </div>
  );
}
