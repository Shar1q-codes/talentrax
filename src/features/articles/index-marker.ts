/**
 * Marks the /insights index's content, so the article modal can tell that
 * the index is really rendered beneath it. Spread onto one element of the
 * index page, present in both the list and the empty state.
 *
 * The modal's backstop reads it: an intercepted article with no index under
 * it is the "dialog over an empty page" failure, and it falls back to a full
 * page load instead. See ArticleModal.tsx and src/proxy.ts.
 */
export const insightsIndexMarker = { "data-insights-index": "" } as const;

export const INSIGHTS_INDEX_SELECTOR = "[data-insights-index]";
