import { NextResponse, type NextRequest } from "next/server";

import { refreshStaffSession } from "@/features/auth/server";

/**
 * The site's one proxy, with two jobs on two matchers.
 *
 * 1. STAFF ROUTES: refresh the staff session before the page renders.
 *    A server component cannot write cookies, so an access token that
 *    expires between visits is renewed here and the new cookies go out on
 *    the response. Not an access check: every staff page and action makes
 *    its own (features/auth/queries.server.ts). With no database in the
 *    build there is no session to refresh.
 *
 * 2. ARTICLES: only the /insights index opens an article in the modal.
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
 *
 * NOT THE ONLY PROTECTION, AND NOT REDUNDANT. ArticleModal does a full page
 * load if it mounts with no index beneath it, which covers a host that does
 * not run this or does not honour the header it removes. This keeps the bad
 * case from happening; that keeps it from showing. Keep both.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/staff" || request.nextUrl.pathname.startsWith("/staff/")) {
    return refreshStaffSession(request);
  }

  const from = request.headers.get("next-url");
  if (from === null || from === "/insights" || from === "/insights/") {
    return NextResponse.next();
  }
  const headers = new Headers(request.headers);
  headers.delete("next-url");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/staff",
    "/staff/:path*",
    { source: "/insights/:slug", has: [{ type: "header", key: "next-url" }] },
  ],
};
