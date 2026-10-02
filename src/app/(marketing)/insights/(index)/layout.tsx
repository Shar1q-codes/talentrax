import type { ReactNode } from "react";

/**
 * The index route group: /insights and its article modal.
 *
 * WHY A ROUTE GROUP. The `@modal` slot below intercepts /insights/[slug]
 * with the `(.)` convention, and an interception applies to every soft
 * navigation made from inside the layout that owns the slot. If this layout
 * sat at app/(marketing)/insights/, a related-reading link on a full article page would
 * be intercepted too, opening a modal over the article instead of
 * navigating. Grouping only the index page under this layout means ONLY
 * THE INDEX INTERCEPTS: the full page at app/(marketing)/insights/[slug] is outside
 * it, and a link to an article from anywhere else on the site is a normal
 * navigation to the full page.
 *
 * THE GROUP IS NOT ENOUGH ON ITS OWN. Next matches the intercept against
 * /insights and every descendant, so a full article page counted as "from
 * the index". Two independent protections close that, and both stay:
 * src/proxy.ts stops the intercept firing from anywhere but /insights, and
 * ArticleModal does a full page load if it ever mounts without this index
 * rendered beneath it (the marker on the index page's content).
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
