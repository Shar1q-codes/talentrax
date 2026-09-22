/**
 * /insights and /insights/[slug] copy.
 *
 * NOTHING IS PUBLISHED. There are no sample articles in this file and there
 * must never be. The home page once carried three invented article cards with
 * made-up titles and excerpts; they were fabricated content on the most
 * indexed page on the site. An invented article at its own URL, with
 * BlogPosting markup attached, is the same mistake with a search engine
 * repeating it. See src/lib/insights.ts.
 *
 * The empty state is written as a true and ordinary state of a young
 * publication - nothing yet, here is what to do instead - not as a
 * "coming soon" and not as an apology.
 *
 * NO AUTHOR COPY anywhere: no byline label, no "written by", no contributor
 * line. The Article type has no author field and this file gives nothing to
 * render one with.
 *
 * NO READING TIMES and no view counts. Both were removed from the home page
 * teaser once already, and both are numbers the content rules forbid.
 */

import type { CtaBandContent } from "./types";

export const INSIGHTS_PATH = "/insights";

export const insightsMeta = {
  title: "Insights",
  description:
    "Hiring and workforce commentary from Talentrax Global across the healthcare, technology and professional desks.",
};

export const insightsHero = {
  eyebrow: "Insights",
  heading: "Insights",
  intro:
    "Notes on hiring and the labour market from the desks that do the recruiting.",
};

/**
 * Shown when getArticles() returns nothing, which is today.
 *
 * It says the true thing plainly and routes both audiences somewhere useful.
 * It does not promise a date, apologise, or imply something is broken.
 */
export const emptyIndex = {
  heading: "Nothing published yet",
  body: [
    "We would rather publish nothing than publish filler. When there is something worth saying about hiring in the disciplines we recruit, it will be here.",
    "In the meantime the useful material on this site is on the pages that describe how the work actually runs, and both of those are more concrete than an article would be.",
  ],
  routes: [
    {
      id: "employer",
      title: "You are hiring",
      description:
        "Tell us what you need to fill and a recruiter from the matching desk picks it up with a market read on the band.",
      linkLabel: "Request talent",
      href: "/employers/request-talent",
    },
    {
      id: "candidate",
      title: "You are looking for work",
      description:
        "Send your resume once. A recruiter who works your discipline reads it, and nothing goes to an employer until you have agreed to the submission.",
      linkLabel: "Upload your resume",
      href: "/job-seekers/upload-resume",
    },
  ],
  guidanceLinkIntro: "There is practical guidance for candidates already:",
  guidanceLinkLabel: "Interview preparation and resume guidance",
  guidanceLinkHref: "/resources",
};

/* ------------------------------------------------------------- The index */

export const articleList = {
  /** Live region on the index once there are articles. */
  countLabelOne: "1 article",
  countLabelMany: "articles",
  /** Prefix on each card's date line. */
  publishedLabel: "Published",
  readLabel: "Read this",
};

/* -------------------------------------------------------- Article detail */

export const articleDetail = {
  eyebrow: "Insights",
  publishedLabel: "Published",
  updatedLabel: "Updated",
  backLabel: "All insights",
};

export const insightsCta: CtaBandContent = {
  heading: "Talk to someone instead",
  description:
    "An article is a poor substitute for a conversation about a specific role or a specific career. Both of ours start with a form and reach a named recruiter.",
  ctas: [
    {
      label: "Request talent",
      href: "/employers/request-talent",
      variant: "inverse",
    },
    {
      label: "Upload your resume",
      href: "/job-seekers/upload-resume",
      variant: "outline-inverse",
    },
  ],
  footnote: "Both reach a person on the desk that recruits your discipline.",
};
