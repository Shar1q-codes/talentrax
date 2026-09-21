/**
 * Landing page copy, section by section, in render order.
 *
 * CONTENT RULE: no string rendered on the home page is typed inline in a
 * component. Components import a section object from here and map over it.
 * When the CMS lands, each export below becomes a fetch that returns the
 * same shape, and no component changes.
 *
 * COPY STATUS: all copy is placeholder pending the client's real content.
 * It is written as plausible, specific staffing language rather than lorem
 * ipsum, but it is NOT approved marketing copy.
 *
 * NUMBERS: none. Client instruction - no statistics, metrics or figures
 * appear anywhere on this site, placeholder ones included. See "Content
 * rules" in CLAUDE.md before adding any.
 *
 * ICONS: data carries an icon *name*; the SVG itself lives in
 * src/components/ui/Icon.tsx. Keeps this file CMS-serialisable.
 */

import { engagementModels } from "./taxonomy";
import type { Cta, CtaBandContent, IconName } from "./types";

/* ---------------------------------------------------------------- 2. Hero */

export type HeroContent = {
  eyebrow: string;
  headline: string;
  subhead: string;
  ctas: Cta[];
  /** Describes what real imagery replaces the gradient slot. */
  imageSlotLabel: string;
};

export const hero: HeroContent = {
  eyebrow: "Healthcare - IT - Professional",
  headline: "Staffing built around the roles you actually need to fill",
  subhead:
    "Talentrax Global places clinical, technical and professional talent for US employers. Specialist recruiters per discipline, screened shortlists, and a process that respects your hiring timeline.",
  ctas: [
    { label: "Find Talent", href: "/employers/request-talent", variant: "primary" },
    { label: "Browse Jobs", href: "/jobs", variant: "secondary" },
  ],
  imageSlotLabel:
    "Image slot: client-supplied photography of a placement team at work",
};

/* ------------------------------------------------------------ 3. Services */

export type ServiceCard = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  /** Short qualifier: who the service suits. */
  bestFor: string;
};

export type ServicesContent = {
  eyebrow: string;
  heading: string;
  intro: string;
  cards: ServiceCard[];
  cta: Cta;
};

export const services: ServicesContent = {
  eyebrow: "What we do",
  heading: "Three ways to staff a team",
  intro:
    "Every engagement starts the same way: a conversation about the role, the team around it, and the timeline you are working to. How we deliver depends on what the hire actually is.",
  cards: [
    {
      id: "direct-hire",
      icon: "handshake",
      title: "Direct Hire",
      description:
        "Permanent placement for roles you intend to own long term. We run the search, screen against your criteria, and present a shortlist you can actually work through.",
      bestFor: "Best for core team roles and backfills",
    },
    {
      id: "contract",
      icon: "clock",
      title: "Contract",
      description:
        "Credentialed contract talent for defined engagements, coverage gaps and project work. We handle payrolling, compliance and onboarding logistics.",
      bestFor: "Best for surge capacity and fixed-scope work",
    },
    {
      id: "executive-search",
      icon: "target",
      title: "Executive Search",
      description:
        "Confidential, research-led search for leadership roles. Mapped markets, discreet approaches, and structured assessment against an agreed scorecard.",
      bestFor: "Best for director level and above",
    },
  ],
  cta: { label: "See all services", href: "/employers/services", variant: "secondary" },
};

/**
 * The home page carries its own, shorter copy for each service rather than
 * reusing the engagement models in content/taxonomy.ts - the pitch on a
 * landing page is not the description on a services page.
 *
 * That leaves the two lists free to drift, and retiring a model is exactly
 * when they do. So assert the link instead of maintaining it by hand: if the
 * home page advertises a service the business no longer offers, the build
 * fails here rather than shipping it.
 */
const offeredModelIds = new Set(engagementModels.map((model) => model.id));
for (const card of services.cards) {
  if (!offeredModelIds.has(card.id)) {
    throw new Error(
      `home.ts: service card "${card.id}" is not an engagement model in content/taxonomy.ts. Either the model was retired and this card should go too, or the id is wrong.`,
    );
  }
}

/* --------------------------------------------------------- 4. Specialties */

export type SpecialtyCard = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  /** Example disciplines. Illustrative, not an exhaustive list. */
  examples: string[];
};

export type SpecialtiesContent = {
  eyebrow: string;
  heading: string;
  intro: string;
  cards: SpecialtyCard[];
  cta: Cta;
};

export const specialties: SpecialtiesContent = {
  eyebrow: "Where we recruit",
  heading: "Three desks, each staffed by specialists",
  intro:
    "Recruiters sit on one desk and stay there. That is how they learn which credentials matter, what a realistic offer looks like, and which candidates are genuinely available.",
  cards: [
    {
      id: "healthcare",
      icon: "stethoscope",
      title: "Healthcare",
      description:
        "Clinical and allied health staffing for hospitals, outpatient groups and post-acute providers, with credentialing and licensure handled before submission.",
      examples: [
        "Nursing",
        "Allied health",
        "Behavioral health",
        "Revenue cycle",
      ],
    },
    {
      id: "it",
      icon: "server",
      title: "Information Technology",
      description:
        "Engineering, infrastructure and data roles for product teams and internal IT, screened for the stack and the delivery model you actually run.",
      examples: [
        "Software engineering",
        "Cloud and DevOps",
        "Data and analytics",
        "Security",
      ],
    },
    {
      id: "professional",
      icon: "briefcase",
      title: "Professional",
      description:
        "Finance, accounting, human resources and operations roles across corporate functions, from individual contributor through to department lead.",
      examples: [
        "Accounting and finance",
        "Human resources",
        "Operations",
        "Administrative",
      ],
    },
  ],
  // The desks live at /employers#specialties. The /specialties route still
  // exists but is unbuilt, so pointing at it would send people from a real
  // list of disciplines to a coming-soon page.
  cta: {
    label: "Explore specialties",
    href: "/employers#specialties",
    variant: "secondary",
  },
};

/* ------------------------------------------------------- 5. Split section */

export type AudiencePanel = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  cta: Cta;
};

export type SplitContent = {
  /** Accessible name for the two-panel region. */
  ariaLabel: string;
  panels: AudiencePanel[];
};

export const split: SplitContent = {
  ariaLabel: "Choose your path",
  panels: [
    {
      id: "for-employers",
      eyebrow: "For Employers",
      title: "Shortlists you can act on, not a stack of resumes",
      description:
        "You get one point of contact, candidates screened against your actual criteria, and honest feedback when a role needs repositioning to fill.",
      benefits: [
        "A specialist recruiter for your discipline, not a generalist",
        "Candidates screened, referenced and credential-checked before submission",
        "Transparent terms and a written replacement guarantee",
        "Market feedback when comp or scope is blocking the search",
      ],
      cta: { label: "Request talent", href: "/employers/request-talent", variant: "primary" },
    },
    {
      id: "for-job-seekers",
      eyebrow: "For Job Seekers",
      title: "A recruiter who knows your field and answers the phone",
      description:
        "We tell you what the role pays, who you would report to, and where you stand. No submissions without your say-so, ever.",
      benefits: [
        "Your resume is never sent anywhere without your permission",
        "Straight answers on compensation, schedule and team structure",
        "Interview preparation from someone who has placed the role before",
        "Contract and permanent openings on one desk",
      ],
      cta: { label: "Browse jobs", href: "/jobs", variant: "primary" },
    },
  ],
};

/* -------------------------------------------------------- 6. How it works */

export type Step = {
  id: string;
  /** Rendered as a visible ordinal. */
  number: string;
  title: string;
  description: string;
};

export type HowItWorksContent = {
  eyebrow: string;
  heading: string;
  intro: string;
  steps: Step[];
};

export const howItWorks: HowItWorksContent = {
  eyebrow: "How it works",
  heading: "Four steps from brief to start date",
  intro:
    "The same process runs on every engagement, whether it is one contract placement or a full requisition set.",
  steps: [
    {
      id: "step-1",
      number: "01",
      title: "Scope the role",
      description:
        "We walk through the requirement, the team it sits in, the must-have credentials and the realistic salary band before anyone starts sourcing.",
    },
    {
      id: "step-2",
      number: "02",
      title: "Source and screen",
      description:
        "Your recruiter works their desk network plus active search, then screens against the agreed criteria. You see candidates, not a keyword match.",
    },
    {
      id: "step-3",
      number: "03",
      title: "Submit and interview",
      description:
        "You get a shortlist with written notes on each candidate. We coordinate scheduling, prepare both sides, and collect structured feedback after each round.",
    },
    {
      id: "step-4",
      number: "04",
      title: "Offer and onboard",
      description:
        "We manage the offer conversation, notice periods and start-date logistics, then stay in contact through the first weeks on site.",
    },
  ],
};

/* ------------------------------------------------------ 7. Closing CTA band */

export const closingCta: CtaBandContent = {
  heading: "Have a role to fill?",
  description:
    "Tell us what you are hiring for and we will come back with a realistic timeline, a market read on the salary band, and the recruiter who will run the search.",
  ctas: [
    { label: "Request talent", href: "/employers/request-talent", variant: "inverse" },
    { label: "Talk to our team", href: "/contact", variant: "outline-inverse" },
  ],
  footnote: "No obligation. We will tell you if we are not the right fit for the search.",
};
