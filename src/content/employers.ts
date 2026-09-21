/**
 * Employers section copy: /employers, /employers/services and the
 * /employers/request-talent form.
 *
 * CONTENT RULE: no string rendered in the Employers section is typed inline
 * in a component. Components import an object from here and map over it.
 *
 * COPY STATUS: placeholder pending the client's real content. It is written
 * as plausible, specific staffing language, but it is NOT approved copy.
 *
 * NUMBERS: none. No placement counts, time-to-fill figures, percentages or
 * years-in-business claims appear anywhere in this file. See "Content rules"
 * in CLAUDE.md. The only numbers here are form constraints (a minimum of one
 * position) and the anti-spam delay, neither of which is a claim.
 *
 * COMMERCIAL TERMS: fees, rates, percentages and guarantee periods are not
 * published. Any commercial point the client has not confirmed carries
 * `detail: null` and renders as the visible [COMMERCIAL TERMS] marker.
 */

import type { Cta, CtaBandContent, ProcessContent, SectionIntro } from "./types";

/* ----------------------------------------------------------- Shared paths */

export const SERVICES_PATH = "/employers/services";
export const REQUEST_TALENT_PATH = "/employers/request-talent";

/** Deep link to one engagement model's section on the services page. */
export function serviceHref(modelId: string): string {
  return `${SERVICES_PATH}#${modelId}`;
}

/* ------------------------------------------------------- Route metadata */

/**
 * Per-route title and description for the three built Employers pages.
 *
 * These used to come from the `comingSoonRoutes` registry in
 * content/navigation.ts. A built route owns its own metadata, so it moved
 * here with the rest of the section copy when the pages were built.
 */
export const employersMeta = {
  overview: {
    title: "For Employers",
    description:
      "How Talentrax Global partners with hiring teams: three engagement models, three specialty desks, and a search process you can see into at every step.",
  },
  services: {
    title: "Engagement Models",
    description:
      "Direct hire, contract and executive search from Talentrax Global - what each model is, when it fits, and how the commercial arrangement works.",
  },
  requestTalent: {
    title: "Request Talent",
    description:
      "Brief the Talentrax Global team on an open role. Tell us the title, specialty, location and timeline, and a recruiter from the matching desk comes back to you.",
  },
};

/* ------------------------------------------------------ 1. /employers hero */

export type EmployersHeroContent = {
  eyebrow: string;
  headline: string;
  subhead: string;
  ctas: Cta[];
  /** Describes what real imagery replaces the gradient slot. */
  imageSlotLabel: string;
};

export const employersHero: EmployersHeroContent = {
  eyebrow: "For Employers",
  headline: "Hire from a desk that only recruits your discipline",
  subhead:
    "Talentrax Global staffs clinical, technical and professional roles for US employers. You get a named recruiter who works your specialty, a written search plan before sourcing starts, and straight answers about what the market will and will not give you.",
  ctas: [
    { label: "Request talent", href: REQUEST_TALENT_PATH, variant: "primary" },
    { label: "See how we engage", href: SERVICES_PATH, variant: "secondary" },
  ],
  imageSlotLabel:
    "Image slot: client-supplied photography of a hiring team in conversation",
};

/* ----------------------------------- 2. /employers: engagement model cards */

export const engagementSection = {
  eyebrow: "How we engage",
  heading: "Three ways to run the hire",
  intro:
    "Every engagement starts with the same conversation about the role, the team around it and the timeline you are working to. What differs is how the person is employed and how the arrangement is paid for.",
  cta: {
    label: "Compare all three in detail",
    href: SERVICES_PATH,
    variant: "secondary",
  } satisfies Cta,
};

/* ----------------------------------------- 3. /employers: specialty section */

export const specialtySection: SectionIntro = {
  eyebrow: "Where we recruit",
  heading: "Three desks, each with its own recruiters",
  intro:
    "A recruiter sits on one desk and stays there. That is how they learn which credentials matter, which titles mean the same job at different employers, and which candidates are genuinely available rather than merely listed.",
};

/* ------------------------------------------------------ 4. How a search runs */

export const searchProcess: ProcessContent = {
  eyebrow: "How a search runs",
  heading: "Five steps, and you can see into every one of them",
  intro:
    "Most staffing relationships go wrong in the gap between the brief and the first shortlist, where the client cannot see what is happening and the recruiter has no incentive to explain. This is the process we run on every engagement, and what you get to see at each step.",
  /** Column headings inside each step. */
  labels: {
    weDo: "What we do",
    youGet: "What you get",
  },
  commitmentsHeading: "What that means you can hold us to",
  steps: [
    {
      id: "intake",
      number: "01",
      title: "Intake and role scoping",
      summary:
        "A working session with the hiring manager, not a form. We need the job as it is actually done, the team it sits in, and what would make you say no to an otherwise strong candidate.",
      weDo: [
        "Interview the hiring manager about the role, the team and the reason it is open",
        "Agree the must-haves, the nice-to-haves and the genuine deal-breakers, in that order",
        "Establish the approval chain and who can move an interview slot",
      ],
      youGet: [
        "A written role brief you approve before anything else happens",
        "An honest read on whether the brief is fillable as written",
        "The name and direct contact details of the recruiter running it",
      ],
    },
    {
      id: "search-plan",
      number: "02",
      title: "Market read and search plan",
      summary:
        "Before sourcing starts we tell you what the market looks like for this role, at this level, in this location, at this band. This is where a search gets repositioned if it needs to be.",
      weDo: [
        "Map where this talent currently sits, by employer type and title",
        "Test the compensation band and the work mode against what comparable roles are offering",
        "Flag any requirement that will materially shrink the candidate pool",
      ],
      youGet: [
        "A written search plan: channels, target employers, expected objections",
        "A direct recommendation if the band, the title or the work mode needs to change",
        "The option to stop here at no cost if the search is not viable as briefed",
      ],
    },
    {
      id: "source-screen",
      number: "03",
      title: "Sourcing and screening",
      summary:
        "Our recruiter works their own desk network alongside active search. Everyone we submit has spoken to a human here about your specific role and agreed to be put forward for it.",
      weDo: [
        "Approach candidates individually, referencing your role rather than a generic pitch",
        "Screen against the agreed criteria in a structured conversation",
        "Verify licences, certifications and right to work before submission where the role requires it",
      ],
      youGet: [
        "A scheduled progress update while the search is live, whether or not there is good news",
        "Early notice when the market is pushing back, with what it is pushing back on",
        "Confirmation that no resume reaches you without that candidate's explicit consent",
      ],
    },
    {
      id: "shortlist",
      number: "04",
      title: "Shortlist and interviews",
      summary:
        "A shortlist you can work through in one sitting, each candidate written up against the criteria you approved at intake, including where they fall short.",
      weDo: [
        "Submit a shortlist with written notes on fit, motivation and compensation expectations",
        "Coordinate scheduling and brief both sides before each round",
        "Collect structured feedback after every interview and relay it in both directions",
      ],
      youGet: [
        "A like-for-like written assessment per candidate, reservations included",
        "Each candidate's current situation, notice period and what else they are considering",
        "A named backup plan if the shortlist does not convert",
      ],
    },
    {
      id: "offer-start",
      number: "05",
      title: "Offer, close and start",
      summary:
        "The offer conversation starts at the first screen, not at the end. By this point we already know what the candidate will accept, what they will counter, and who else is in play.",
      weDo: [
        "Pre-close on the agreed package before any offer is formally extended",
        "Manage notice periods, counteroffer risk and start-date logistics",
        "Stay in contact with both sides through the first weeks on site",
      ],
      youGet: [
        "Advance warning of a likely decline, rather than a surprise on offer day",
        "A written summary of what was agreed and when the person starts",
        "A single point of contact if anything wobbles after the start date",
      ],
    },
  ],
  commitments: [
    {
      id: "named-recruiter",
      title: "You always know who is working your role",
      detail:
        "One named recruiter on the search, with direct contact details. Not a shared inbox, and not a different account manager each time you call.",
    },
    {
      id: "consent",
      title: "Nothing is submitted without consent",
      detail:
        "Every candidate agrees to be put forward for your role specifically. We do not spray resumes and we do not submit the same person to you through two routes.",
    },
    {
      id: "bad-news",
      title: "You hear the bad news early",
      detail:
        "If the band is wrong, the title is wrong or the role is not fillable as briefed, we tell you at the search plan stage while you can still act on it.",
    },
    {
      id: "terms-in-writing",
      title: "Terms are in writing before we start",
      detail:
        "Fees, guarantee periods and payment schedules are agreed and signed before sourcing begins. No invoice should ever be the first time you see a number.",
    },
  ],
};

/* ------------------------------------------------------- 5. Closing CTA band */

export const employersCta: CtaBandContent = {
  heading: "Tell us what you are hiring for",
  description:
    "Send us the role and we will come back with a market read on the band, a realistic view of the timeline, and the recruiter who would run the search.",
  ctas: [
    { label: "Request talent", href: REQUEST_TALENT_PATH, variant: "inverse" },
    { label: "Talk to our team", href: "/contact", variant: "outline-inverse" },
  ],
  footnote:
    "No obligation. We will tell you if we are not the right firm for the search.",
};

/* --------------------------------------------- 6. /employers/services page */

export const servicesPage = {
  eyebrow: "Employers",
  heading: "Engagement models",
  intro:
    "Three ways to staff a role, and the commercial arrangement behind each one stated in plain terms. Fees, rates and guarantee periods are agreed in writing with you before a search opens, so they are not published here.",
  /** Accessible name for the in-page anchor nav. */
  onThisPageLabel: "On this page",
  headings: {
    whatItIs: "What it is",
    whenItFits: "When it fits",
    commercial: "How the commercial arrangement works",
  },
  cta: {
    label: "Request talent",
    href: REQUEST_TALENT_PATH,
    variant: "primary",
  } satisfies Cta,
};

export const servicesCta: CtaBandContent = {
  heading: "Not sure which model fits?",
  description:
    "Describe the role and the constraint you are working under - budget, headcount, timeline - and we will tell you which of the three actually suits it, including when the answer is none of them.",
  ctas: [
    { label: "Request talent", href: REQUEST_TALENT_PATH, variant: "inverse" },
    { label: "Ask a question", href: "/contact", variant: "outline-inverse" },
  ],
  footnote: "We would rather talk you out of the wrong model than sell it to you.",
};
