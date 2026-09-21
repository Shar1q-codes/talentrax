/**
 * ============================================================================
 *  TEST FIXTURES ONLY. THIS FILE MUST NEVER BE IMPORTED BY A PAGE, A LAYOUT,
 *  A COMPONENT, OR ANYTHING ELSE THAT REACHES THE BUILD OUTPUT.
 * ============================================================================
 *
 * These are not real articles and never were. Invented editorial on a
 * staffing site is a claim about a market made by nobody, and with
 * BlogPosting markup attached it is a claim a search engine will repeat.
 *
 * Every fixture carries FIXTURE_SENTINEL in its id, slug and title, so a
 * single grep over the build output proves nothing leaked:
 *
 *   npm run build
 *   grep -r "DO-NOT-SHIP-FIXTURE" .next    # must print nothing
 *
 * That check runs as part of the verification for this section, alongside the
 * identical one for the job fixtures. If it ever prints something, a fixture
 * has been imported into the app and the site is publishing invented writing.
 *
 * Nothing imports this file except *.test.ts, which Next never bundles
 * because no route reaches them.
 */

import type { Article } from "./insights.ts";

/** Greppable marker. Present in every fixture id, slug and title. */
export const FIXTURE_SENTINEL = "DO-NOT-SHIP-FIXTURE";

/** Every block kind, so the renderer and the schema are both exercised. */
export const fullArticle: Article = {
  id: `${FIXTURE_SENTINEL}-0001`,
  slug: `${FIXTURE_SENTINEL}-full-article`,
  title: `${FIXTURE_SENTINEL} Fixture article with every block kind`,
  standfirst: "A fixture standfirst, which doubles as the meta description.",
  datePublished: "2026-09-01",
  dateModified: "2026-09-14",
  body: [
    { kind: "paragraph", text: "First fixture paragraph." },
    { kind: "heading", text: "A fixture subheading" },
    { kind: "paragraph", text: "Second fixture paragraph." },
    { kind: "list", items: ["Fixture item one.", "Fixture item two."] },
  ],
};

/** Never edited, so dateModified equals datePublished. */
export const unmodifiedArticle: Article = {
  id: `${FIXTURE_SENTINEL}-0002`,
  slug: `${FIXTURE_SENTINEL}-unmodified`,
  title: `${FIXTURE_SENTINEL} Fixture article never edited`,
  standfirst: "A fixture standfirst for an article that was never edited.",
  datePublished: "2026-09-10",
  dateModified: "2026-09-10",
  body: [{ kind: "paragraph", text: "Only one fixture paragraph here." }],
};

export const fixturePublisher = {
  name: "Fixture Org",
  siteUrl: "https://fixture.example.com",
};
