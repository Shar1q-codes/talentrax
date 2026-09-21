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

import type { Cta, CtaBandContent, IconName } from "./types";

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
      "How Talentrax Global partners with hiring teams: five engagement models, three specialty desks, and a search process you can see into at every step.",
  },
  services: {
    title: "Engagement Models",
    description:
      "Direct hire, contract, contract-to-hire, healthcare RPO and executive search from Talentrax Global - what each model is, when it fits, and how the commercial arrangement works.",
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

/* ------------------------------------------- 2. The five engagement models */

/**
 * One commercial point. `detail: null` means the client has not confirmed the
 * terms, so the page renders the [COMMERCIAL TERMS] marker instead of a
 * number. Nothing here invents a fee, a rate or a guarantee period.
 */
export type CommercialPoint = {
  id: string;
  label: string;
  detail: string | null;
};

export type EngagementModel = {
  /** Also the anchor id for this model's section on the services page. */
  id: string;
  icon: IconName;
  name: string;
  /** One line, used on the /employers card. */
  summary: string;
  /** Short qualifier under the card. */
  bestFor: string;
  /** Services page: what the model actually is. */
  whatItIs: string;
  /** Services page: the situations it suits. */
  whenItFits: string[];
  /** Services page: the commercial arrangement, in plain terms. */
  commercial: CommercialPoint[];
};

export const engagementModels: EngagementModel[] = [
  {
    id: "direct-hire",
    icon: "handshake",
    name: "Direct Hire",
    summary:
      "Permanent placement for roles you intend to own long term, run as a full search against criteria you sign off.",
    bestFor: "Best for core team roles and backfills",
    whatItIs:
      "A contingent permanent search. We take the brief, agree the criteria in writing, run the search, and present a shortlist with written notes on every candidate. The hire goes on your payroll from day one and the relationship is yours.",
    whenItFits: [
      "The role is permanent, budgeted and signed off",
      "You want one recruiter accountable for the search rather than several agencies racing each other",
      "The criteria are firm enough to screen against, or you want help making them firm",
    ],
    commercial: [
      {
        id: "direct-hire-basis",
        label: "How it is charged",
        detail:
          "A one-time placement fee calculated on the hire's first-year base salary and invoiced after they start. Nothing is payable while the search runs, and nothing is payable if you do not hire.",
      },
      {
        id: "direct-hire-rate",
        label: "Fee percentage",
        detail: null,
      },
      {
        id: "direct-hire-guarantee",
        label: "Replacement guarantee period",
        detail: null,
      },
      {
        id: "direct-hire-terms",
        label: "Agreed before we start",
        detail:
          "The fee, the guarantee period and the payment schedule are set out in a signed agreement before any sourcing begins. We do not open a search on unagreed terms.",
      },
    ],
  },
  {
    id: "contract",
    icon: "clock",
    name: "Contract",
    summary:
      "Credentialed talent on our payroll for defined engagements, coverage gaps and project work.",
    bestFor: "Best for surge capacity and fixed-scope work",
    whatItIs:
      "The worker is employed and payrolled by Talentrax Global for the length of the assignment. We carry the employment relationship, the insurances and the compliance obligations; you direct the work. You are invoiced against approved timesheets.",
    whenItFits: [
      "The need has an end date, a project scope, or a census that will change",
      "You are covering leave, a vacancy or a seasonal peak",
      "Headcount is frozen but the work is not",
    ],
    commercial: [
      {
        id: "contract-basis",
        label: "How it is charged",
        detail:
          "An hourly bill rate per worker, invoiced on approved timesheets. The rate is all-inclusive: pay, employer taxes, workers compensation, benefits administration and our margin, so there is no separate placement fee.",
      },
      {
        id: "contract-rate",
        label: "Bill rate and margin",
        detail: null,
      },
      {
        id: "contract-conversion",
        label: "Converting a contractor to your payroll",
        detail: null,
      },
      {
        id: "contract-admin",
        label: "What we carry",
        detail:
          "Onboarding, licence and credential verification, background and drug screening where the role requires it, timesheet administration, payroll, and the employment paperwork. You approve hours and direct the work.",
      },
    ],
  },
  {
    id: "contract-to-hire",
    icon: "repeat",
    name: "Contract-to-Hire",
    summary:
      "Start the person on contract and convert them to your payroll on a date agreed up front.",
    bestFor: "Best when fit matters more than speed",
    whatItIs:
      "A contract assignment with a permanent outcome written into it from the start. The worker knows the role is intended to convert, both sides get a real working trial, and the conversion date and terms are agreed before the assignment begins rather than negotiated once it is running.",
    whenItFits: [
      "The role is permanent but the requisition is not open yet",
      "The work is hard to assess in an interview and easy to assess on the job",
      "A previous hire interviewed better than they worked",
    ],
    commercial: [
      {
        id: "cth-basis",
        label: "How it is charged",
        detail:
          "An hourly bill rate for the contract period, exactly as a contract engagement, followed by a conversion fee when the person moves onto your payroll.",
      },
      {
        id: "cth-conversion-fee",
        label: "Conversion fee, and how it reduces over the assignment",
        detail: null,
      },
      {
        id: "cth-trial",
        label: "Standard trial length before conversion",
        detail: null,
      },
      {
        id: "cth-transparency",
        label: "What the candidate is told",
        detail:
          "That the assignment is intended to convert, on what date, and on what terms. We do not describe a contract-to-hire role as permanent, and we do not describe a contract role as contract-to-hire to get it filled.",
      },
    ],
  },
  {
    id: "healthcare-rpo",
    icon: "layers",
    name: "Healthcare RPO",
    summary:
      "We run all or part of your talent function across a requisition set rather than a single role.",
    bestFor: "Best for sustained, high-volume clinical hiring",
    whatItIs:
      "Recruitment process outsourcing for health systems and provider groups. Our recruiters work inside your process, on your applicant tracking system and under your employer brand, taking on sourcing, screening, scheduling and offer coordination across an agreed set of requisitions.",
    whenItFits: [
      "You hire continuously into the same role families rather than filling one vacancy at a time",
      "Your internal team is carrying more requisitions than it can run properly",
      "You want one consistent candidate experience across every opening instead of agency-by-agency variation",
    ],
    commercial: [
      {
        id: "rpo-basis",
        label: "How it is charged",
        detail:
          "A monthly management fee for an agreed scope of requisitions and recruiter capacity, rather than a fee per hire. Scope, service levels and review points are defined in a statement of work.",
      },
      {
        id: "rpo-fee",
        label: "Management fee and scope bands",
        detail: null,
      },
      {
        id: "rpo-term",
        label: "Minimum term and notice period",
        detail: null,
      },
      {
        id: "rpo-governance",
        label: "How it is governed",
        detail:
          "A named engagement lead, a standing review with your talent leadership, and reporting drawn from your own applicant tracking system so the record stays yours rather than ours.",
      },
    ],
  },
  {
    id: "executive-search",
    icon: "target",
    name: "Executive Search",
    summary:
      "Confidential, research-led search for leadership roles, assessed against a scorecard you sign off.",
    bestFor: "Best for director level and above",
    whatItIs:
      "A retained search. We map the market, approach passive candidates discreetly, and assess against a scorecard agreed before the search opens. You receive the research, including who declined and why, not only the shortlist.",
    whenItFits: [
      "The appointment is significant enough that a miss is expensive",
      "The search must stay confidential, from the market or from your own organisation",
      "The people you want are employed rather than applying, and have to be approached individually",
    ],
    commercial: [
      {
        id: "search-basis",
        label: "How it is charged",
        detail:
          "A retained fee paid in instalments across the search rather than on placement: one to open the search, one at shortlist, one on start. Retention is what buys the research time an executive search actually needs.",
      },
      {
        id: "search-fee",
        label: "Retainer structure and fee basis",
        detail: null,
      },
      {
        id: "search-offlimits",
        label: "Off-limits period on placed executives",
        detail: null,
      },
      {
        id: "search-reporting",
        label: "What you receive",
        detail:
          "A written market map, a documented scorecard assessment for every shortlisted candidate, and a search log showing who was approached and what they said. The research is yours whether or not you hire.",
      },
    ],
  },
];

export const engagementSection = {
  eyebrow: "How we engage",
  heading: "Five ways to run the hire",
  intro:
    "Every engagement starts with the same conversation about the role, the team around it and the timeline you are working to. What differs is how the person is employed and how the arrangement is paid for.",
  cta: {
    label: "Compare all five in detail",
    href: SERVICES_PATH,
    variant: "secondary",
  } satisfies Cta,
};

/* ----------------------------------------------- 3. Specialty areas we run */

export type SubSpecialty = {
  id: string;
  name: string;
  /** What sits inside the discipline. Descriptive, never a claim. */
  detail: string;
};

export type SpecialtyArea = {
  id: string;
  icon: IconName;
  name: string;
  description: string;
  subSpecialties: SubSpecialty[];
};

export const specialtyAreas: SpecialtyArea[] = [
  {
    id: "healthcare",
    icon: "stethoscope",
    name: "Healthcare",
    description:
      "Clinical and provider staffing for hospitals, outpatient groups and post-acute settings. Licensure, certification and credentialing are verified before a candidate reaches you.",
    subSpecialties: [
      {
        id: "nursing",
        name: "Nursing",
        detail:
          "Med-surg, critical care, perioperative, emergency and specialty units",
      },
      {
        id: "np-aprn",
        name: "NP / APRN",
        detail:
          "Nurse practitioners and advanced practice nurses across primary and specialty care",
      },
      {
        id: "allied-health",
        name: "Allied health",
        detail:
          "Imaging, laboratory, respiratory, rehabilitation and pharmacy support",
      },
      {
        id: "physicians",
        name: "Physicians",
        detail: "Employed and locum physician roles, hospital-based and ambulatory",
      },
    ],
  },
  {
    id: "technology",
    icon: "server",
    name: "Technology",
    description:
      "Engineering, infrastructure and security roles for product teams and internal IT, screened against the stack you actually run rather than the keywords in the posting.",
    subSpecialties: [
      {
        id: "software-engineering",
        name: "Software engineering",
        detail: "Frontend, backend, full-stack, mobile and platform engineering",
      },
      {
        id: "cybersecurity",
        name: "Cybersecurity",
        detail:
          "Security engineering and operations, governance and risk, identity, incident response",
      },
      {
        id: "data",
        name: "Data",
        detail:
          "Data engineering, analytics, business intelligence and machine learning",
      },
      {
        id: "cloud",
        name: "Cloud",
        detail: "Cloud architecture, migration and platform operations",
      },
      {
        id: "devops",
        name: "DevOps",
        detail:
          "CI/CD, infrastructure as code, observability and site reliability",
      },
      {
        id: "qa",
        name: "QA",
        detail: "Manual and automated testing, SDET and release quality",
      },
    ],
  },
  {
    id: "professional",
    icon: "briefcase",
    name: "Professional",
    description:
      "Corporate function and skilled trade roles, from individual contributor through department lead, for employers hiring outside the clinical and technical desks.",
    subSpecialties: [
      {
        id: "accounting-finance",
        name: "Accounting and finance",
        detail:
          "Accounting, financial planning and analysis, payroll and revenue cycle",
      },
      {
        id: "human-resources",
        name: "Human resources",
        detail:
          "HR business partnering, talent acquisition, benefits and HR operations",
      },
      {
        id: "administrative",
        name: "Administrative",
        detail:
          "Executive assistance, coordination, scheduling and office operations",
      },
      {
        id: "sales-marketing",
        name: "Sales and marketing",
        detail:
          "Business development, account management, marketing and communications",
      },
      {
        id: "trades",
        name: "Trades",
        detail: "Skilled trades, facilities, maintenance and light industrial",
      },
    ],
  },
];

export const specialtySection = {
  eyebrow: "Where we recruit",
  heading: "Three desks, each with its own recruiters",
  intro:
    "A recruiter sits on one desk and stays there. That is how they learn which credentials matter, which titles mean the same job at different employers, and which candidates are genuinely available rather than merely listed.",
};

/* ------------------------------------------------------ 4. How a search runs */

export type SearchStep = {
  id: string;
  /** Rendered as a visible ordinal, aria-hidden: the <ol> already conveys order. */
  number: string;
  title: string;
  summary: string;
  /** What our recruiter does at this step. */
  weDo: string[];
  /** What you receive or decide at this step. The transparency half. */
  youGet: string[];
};

export type Commitment = {
  id: string;
  title: string;
  detail: string;
};

export const searchProcess = {
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
  ] satisfies SearchStep[],
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
  ] satisfies Commitment[],
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
    "Five ways to staff a role, and the commercial arrangement behind each one stated in plain terms. Fees, rates and guarantee periods are agreed in writing with you before a search opens, so they are not published here.",
  /** Accessible name for the in-page anchor nav. */
  onThisPageLabel: "On this page",
  headings: {
    whatItIs: "What it is",
    whenItFits: "When it fits",
    commercial: "How the commercial arrangement works",
  },
  /** Rendered in place of any commercial detail the client has not confirmed. */
  commercialPlaceholder: "[COMMERCIAL TERMS]",
  commercialPlaceholderNote:
    "Marked terms are pending client confirmation and are deliberately not published. Ask us and we will send the current schedule.",
  cta: {
    label: "Request talent",
    href: REQUEST_TALENT_PATH,
    variant: "primary",
  } satisfies Cta,
};

export const servicesCta: CtaBandContent = {
  heading: "Not sure which model fits?",
  description:
    "Describe the role and the constraint you are working under - budget, headcount, timeline - and we will tell you which of the five actually suits it, including when the answer is none of them.",
  ctas: [
    { label: "Request talent", href: REQUEST_TALENT_PATH, variant: "inverse" },
    { label: "Ask a question", href: "/contact", variant: "outline-inverse" },
  ],
  footnote: "We would rather talk you out of the wrong model than sell it to you.",
};
