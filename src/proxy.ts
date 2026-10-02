import { NextResponse, type NextRequest } from "next/server";

/**
 * Only the /insights index opens an article in the modal.
 *
 * Next decides interception from the `Next-Url` request header the App
 * Router sends on a soft navigation, matched against the intercepting
 * route's path - and it matches that path AND EVERY DESCENDANT
 * (next/dist/lib/generate-interception-routes-rewrites.js:
 * `/insights(?:/.*)?`). A full article page at /insights/<slug> is a
 * descendant, so a related-reading link on it was intercepted into the
 * modal slot of the index layout, over an index page that was not there:
 * a dialog over an empty page, with no <h1>.
 *
 * Route groups do not reach URLs, so no file layout can narrow that match.
 * This does it instead: on an in-app navigation to an article, unless it
 * starts from the index itself, the header goes, and the navigation is the
 * ordinary one to the full page.
 *
 * The matcher means this runs only for soft navigations to an article - the
 * requests that carry `Next-Url`. A crawler, a direct visit, a reload and
 * `check:seo` never reach it.
 */
export function proxy(request: NextRequest) {
  const from = request.headers.get("next-url");
  if (from === null || from === "/insights" || from === "/insights/") {
    return NextResponse.next();
  }
  const headers = new Headers(request.headers);
  headers.delete("next-url");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [{ source: "/insights/:slug", has: [{ type: "header", key: "next-url" }] }],
};
