import type { ReactNode } from "react";

/**
 * The index route group: /insights and its article modal.
 *
 * WHY A ROUTE GROUP. The `@modal` slot below intercepts /insights/[slug]
 * with the `(.)` convention, and an interception applies to every soft
 * navigation made from inside the layout that owns the slot. If this layout
 * sat at app/insights/, a related-reading link on a full article page would
 * be intercepted too, opening a modal over the article instead of
 * navigating. Grouping only the index page under this layout means ONLY
 * THE INDEX INTERCEPTS: the full page at app/insights/[slug] is outside
 * it, and a link to an article from anywhere else on the site is a normal
 * navigation to the full page.
 *
 * `(index)` and `@modal` are not URL segments, so /insights and
 * /insights/[slug] are unchanged, and a hard visit, refresh, shared link or
 * crawler on /insights/[slug] renders the full page: the slot only ever
 * fills on a soft navigation.
 */
export default function InsightsIndexLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
