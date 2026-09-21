/**
 * The shared taxonomy: the ways we engage, and the desks we recruit on.
 *
 * This is domain data, not page copy. Both the Employers section and the Job
 * Seekers section describe the same five engagement models and the same three
 * desks, and the Request Talent and Upload Resume forms build their option
 * lists from these arrays. It lives here so neither section owns it and
 * neither one can drift from the other.
 *
 * Page-level copy that wraps this data - headings, intros, CTAs - stays in
 * the content file for the section that renders it.
 *
 * COMMERCIAL TERMS: fees, rates, percentages and guarantee periods are not
 * published. A commercial point the client has not confirmed carries
 * `detail: null` and is not rendered at all - see CLAUDE.md rule 6.
 */

import type { IconName } from "./types";

/* ----------------------------------------------- The five engagement models */

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

/* ------------------------------------------------- The three recruiting desks */

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

