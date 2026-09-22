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

import { commitments } from "./commitments";
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
    "Talentrax Global staffs clinical, technical and professional roles for US employers. You get a named recruiter who works your specialty, a written search plan before sourcing starts, and a straight answer on what the market will bear for the role.",
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
    "A recruiter sits on one desk and stays there. That is how they learn which credentials matter, which titles mean the same job at different employers, and which candidates are genuinely available.",
};

/* ------------------------------------------------------ 4. How a search runs */

export const searchProcess: ProcessContent = {
  eyebrow: "How a search runs",
  heading: "Five stages, and what you receive at each one",
  intro:
    "The same five stages run on every engagement, and each one ends with something in your hands: a document, a decision or a shortlist. You can see where a search has got to at any point.",
  /** Column heading inside each step. Outcomes only: see types.ts. */
  labels: {
    youGet: "What you get",
  },
  commitmentsHeading: "What you can hold us to",
  steps: [
    {
      id: "intake",
      number: "01",
      title: "Intake and role scoping",
      summary:
        "A working session with the hiring manager to capture the job as it is actually done, the team it sits in, and what would rule out an otherwise strong candidate.",
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
        "Before sourcing starts you see what the market looks like for this role, at this level, in this location, at this band, and the search is repositioned here if it needs to be.",
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
        "Everyone we submit has spoken to a recruiter here about your specific role, agreed to be put forward for it, and been screened against the criteria you approved.",
      youGet: [
        "A scheduled progress update while the search is live, including when the market is pushing back and on what",
        "Every resume that reaches you carrying that candidate's explicit consent",
        "Licences, certifications and right to work verified before submission, where the role requires it",
      ],
    },
    {
      id: "shortlist",
      number: "04",
      title: "Shortlist and interviews",
      summary:
        "A shortlist you can work through in one sitting, each candidate written up against the criteria you approved at intake, including where they fall short.",
      youGet: [
        "A like-for-like written assessment per candidate, reservations included",
        "Each candidate's current situation, notice period and what else they are considering",
        "Scheduling handled and both sides briefed before each round, with structured feedback relayed after it",
        "A named backup plan if the shortlist does not convert",
      ],
    },
    {
      id: "offer-start",
      number: "05",
      title: "Offer, close and start",
      summary:
        "The offer conversation starts at the first screen, so by this point we already know what the candidate will accept, what they will counter, and who else is in play.",
      youGet: [
        "Advance warning of a likely decline, before offer day",
        "A written summary of what was agreed and when the person starts",
        "A single point of contact through the first weeks on site",
      ],
    },
  ],
  // One wording for these, in content/commitments.ts, shared with /about and
  // /job-seekers. Two versions of the same promise is how a business ends up
  // making two different promises.
  commitments: [
    commitments.namedRecruiter,
    commitments.consentBeforeSubmission,
    commitments.badNewsEarly,
    commitments.termsInWriting,
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
    "No obligation, and a straight answer if the search needs a different firm.",
};

/* --------------------------------------------- 6. /employers/services page */

export const servicesPage = {
  eyebrow: "Employers",
  heading: "Engagement models",
  intro:
    "Three ways to staff a role, and the commercial arrangement behind each one stated in plain terms. Fees, rates and guarantee periods are agreed in writing with you before a search opens.",
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
    "Describe the role and the constraint you are working under - budget, headcount, timeline - and we will tell you which of the three suits it, or that none does.",
  ctas: [
    { label: "Request talent", href: REQUEST_TALENT_PATH, variant: "inverse" },
    { label: "Ask a question", href: "/contact", variant: "outline-inverse" },
  ],
  footnote: "The model is agreed with you before anything is signed.",
};
