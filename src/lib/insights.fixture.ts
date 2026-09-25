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
  metaTitle: `${FIXTURE_SENTINEL} Fixture meta title`,
  metaDescription: "A fixture meta description, which is also the BlogPosting description.",
  summary: "A fixture summary: the opening paragraph that answers the question.",
  keyTakeaways: {
    heading: "Key takeaways",
    items: ["Fixture takeaway one.", "Fixture takeaway two."],
  },
  datePublished: "2026-09-01",
  dateModified: "2026-09-14",
  body: [
    { kind: "paragraph", text: "First fixture paragraph." },
    { kind: "heading", level: 2, text: "A fixture subheading" },
    {
      kind: "paragraph",
      text: "Second fixture paragraph with a link to a fixture and one outside.",
      links: [
        { start: 34, end: 48, href: `/insights/${FIXTURE_SENTINEL}-unmodified` },
        { start: 53, end: 64, href: "https://fixture.example.com/outside" },
      ],
    },
    {
      kind: "list",
      ordered: false,
      items: [
        { text: "Fixture item one." },
        { text: "Fixture item two, linked.", links: [{ start: 18, end: 24, href: "/contact" }] },
      ],
    },
    { kind: "heading", level: 3, text: "A fixture sub-subheading" },
    { kind: "list", ordered: true, items: [{ text: "Fixture step one." }, { text: "Fixture step two." }] },
    {
      kind: "table",
      header: ["Fixture column", "Fixture value"],
      rows: [
        ["Fixture row one", "1"],
        ["Fixture row two", "2"],
      ],
    },
  ],
  faqs: [
    {
      question: "Is this a fixture question?",
      answer: [{ text: "Yes." }, { text: "It has a second paragraph so the join is exercised." }],
    },
    { question: "Is this the second fixture question?", answer: [{ text: "Also yes." }] },
  ],
  sources: [
    { name: "Fixture source", url: "https://fixture.example.com/source" },
  ],
  related: [`${FIXTURE_SENTINEL}-unmodified`],
};

/** Never edited, so dateModified equals datePublished. No FAQ, no related. */
export const unmodifiedArticle: Article = {
  id: `${FIXTURE_SENTINEL}-0002`,
  slug: `${FIXTURE_SENTINEL}-unmodified`,
  title: `${FIXTURE_SENTINEL} Fixture article never edited`,
  metaTitle: `${FIXTURE_SENTINEL} Fixture unmodified meta title`,
  metaDescription: "A fixture meta description for an article that was never edited.",
  summary: "A fixture summary for an article that was never edited.",
  keyTakeaways: { heading: "Key takeaways", items: ["Only one fixture takeaway."] },
  datePublished: "2026-09-10",
  dateModified: "2026-09-10",
  body: [{ kind: "paragraph", text: "Only one fixture paragraph here." }],
  faqs: [],
  sources: [{ name: "Fixture source", url: "https://fixture.example.com/source" }],
  related: [],
};

export const fixturePublisher = {
  name: "Fixture Org",
  siteUrl: "https://fixture.example.com",
};
