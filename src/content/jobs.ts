/**
 * /jobs and /jobs/[slug] copy.
 *
 * THE BOARD IS EMPTY. There are no sample postings in this file and there
 * must never be: a fabricated JobPosting with structured data attached can
 * get the whole domain removed from Google for Jobs, and a candidate who
 * applies to an invented role has been lied to. See src/lib/jobs.ts.
 *
 * The empty state below is written to read as a deliberate state of the
 * business - we have nothing open right now, here is what to do instead -
 * rather than as a broken page or a "coming soon".
 *
 * NUMBERS: the results count on the board is the one number this site
 * publishes, and it is the exact case the content rules allow - counted live
 * from the data, not a claim. Everything else here is copy.
 */

import type { CtaBandContent } from "./types";

export const JOBS_PATH = "/jobs";

export const jobsMeta = {
  title: "Browse Jobs",
  description:
    "Open roles at Talentrax Global across healthcare, technology and professional desks. Every posting shows its pay range, location and engagement type.",
};

export const jobsHero = {
  eyebrow: "Job Seekers",
  heading: "Open roles",
  intro:
    "Every posting here shows the pay range, the location and how the role is engaged, before you spend any time on it.",
};

/**
 * Shown when getJobs() returns nothing, which is today.
 *
 * It says the true thing plainly and then routes people somewhere useful.
 * What it does not do is apologise, promise a date, or pretend a posting
 * exists.
 */
export const emptyBoard = {
  heading: "No roles are open right now",
  body: [
    "Not every desk has something live at every moment, and we would rather show you an empty board than pad it out with roles that are already filled or were never real.",
    "Most of our work is not posted anyway. A recruiter matches candidates already on file before a role reaches a job board, so the useful move is to be on file.",
  ],
  routes: [
    {
      id: "candidate",
      title: "Send us your resume",
      description:
        "A recruiter who works your discipline reads it, and contacts you when something matches what you told us you want. Nothing goes to an employer without your say-so.",
      linkLabel: "Upload your resume",
      href: "/job-seekers/upload-resume",
    },
    {
      id: "employer",
      title: "You are hiring, not looking",
      description:
        "Tell us what you need to fill and a recruiter from the matching desk picks it up with a market read on the band.",
      linkLabel: "Request talent",
      href: "/employers/request-talent",
    },
  ],
  /** Sends candidates to the page that explains what happens after they apply. */
  processLinkIntro: "Not sure what happens after you send a resume?",
  processLinkLabel: "Read how applying works",
  processLinkHref: "/job-seekers",
};

/* ------------------------------------------------------------ The board UI */

export const board = {
  /** Accessible name for the filter region. */
  filtersLegend: "Filter these roles",
  filtersHint: "Narrowing on one filter does not clear the others.",
  filterLabels: {
    desk: "Desk",
    specialty: "Specialty",
    state: "State",
    engagement: "Engagement type",
  },
  /** First option in every filter select: no narrowing applied. */
  anyOption: "Any",
  clearLabel: "Clear all filters",
  /** Live region announcing how many roles match. */
  resultsLabelOne: "1 role matches",
  resultsLabelMany: "roles match",
  noMatchesHeading: "No roles match those filters",
  noMatchesBody:
    "Widen one of them, or clear them all and look at everything that is open.",
  cardLinkLabel: "View role",
  /** Labels on the summary line of each card and at the top of a posting. */
  metaLabels: {
    desk: "Desk",
    specialty: "Specialty",
    location: "Location",
    engagement: "Engagement",
    pay: "Pay",
    posted: "Posted",
  },
  workModeLabels: {
    onsite: "Onsite",
    hybrid: "Hybrid",
    remote: "Remote",
  } as Record<string, string>,
  payUnitLabels: {
    hour: "an hour",
    year: "a year",
  } as Record<string, string>,
};

/* ----------------------------------------------------------- Job detail page */

export const jobDetail = {
  eyebrow: "Open role",
  headings: {
    description: "About the role",
    responsibilities: "What you would be doing",
    requirements: "What we are looking for",
  },
  applyLabel: "Apply for this role",
  applyHref: "/job-seekers/upload-resume",
  applyNote:
    "Applying sends us your resume through the same form as any other application. Your recruiter will reference this role, and nothing goes to the employer until you have agreed.",
  backLabel: "All open roles",
};

export const jobsCta: CtaBandContent = {
  heading: "Be on file before the next one opens",
  description:
    "Most roles are filled from candidates a recruiter already knows. One upload puts you in front of the desk that recruits your discipline.",
  ctas: [
    {
      label: "Upload your resume",
      href: "/job-seekers/upload-resume",
      variant: "inverse",
    },
    {
      label: "How applying works",
      href: "/job-seekers",
      variant: "outline-inverse",
    },
  ],
  footnote:
    "No account to create. Your resume is not shared with any employer until you approve them by name.",
};
