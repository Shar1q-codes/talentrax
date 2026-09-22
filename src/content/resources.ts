/**
 * /resources content: interview preparation and resume guidance.
 *
 * SCOPE IS TWO THINGS. No salary guides, no compensation benchmarks, no
 * market rates, no pay data of any kind. That is the no-statistics rule, and
 * narrowing this page to two subjects is what the rule left standing. The
 * route used to be advertised as "Salary Guides" in the nav; it is not that
 * page and never will be.
 *
 * NO NUMBERS AT ALL on this page. Not a percentage, not "six seconds on a
 * resume", not "two pages maximum", not a file size. Most resume folklore is
 * a statistic someone made up, and the content rules forbid statistics
 * regardless of whether they happen to be true. Where a limit genuinely
 * exists it lives on the form that enforces it, and this page links there.
 *
 * NO ATTRIBUTED CLAIMS. Nothing here may say "our recruiters find that",
 * "in our experience", "we have seen" or "studies show". Nobody at the client
 * has told us what their recruiters observe, and inventing an observation is
 * inventing a fact. This is guidance the firm publishes - written as what to
 * do, not as a claim about what anyone noticed.
 *
 * NO NAMED PEOPLE, no bylines, no author. NO DOWNLOADS: there are no
 * templates or PDFs to attach, so the page offers none.
 *
 * The desk-specific guidance derives its desk and specialty names from
 * content/taxonomy.ts, so retiring a desk rewrites this page with it.
 */

import {
  deskNamesSentence,
  specialtyAreas,
  subSpecialtyNamesSentence,
} from "./taxonomy";
import type { CtaBandContent, SectionIntro } from "./types";

export const RESOURCES_PATH = "/resources";

export const resourcesMeta = {
  title: "Resources",
  // Narrowed from the old coming-soon description, which also promised
  // "salary guides" and "hiring advice". The page delivers neither, so the
  // description does not claim them.
  description: `Interview preparation and resume guidance for candidates: what to have ready for a screening call, what an employer interview asks of you, and how to structure a resume for the ${deskNamesSentence()} desks.`,
};

export const resourcesHero = {
  eyebrow: "Job Seekers",
  heading: "Interview preparation and resume guidance",
  intro:
    "Practical guidance for candidates, whether or not you are working with us. No templates to download and nothing to sign up for - just what to have ready and how to present it.",
};

export type GuidanceBlock = {
  id: string;
  heading: string;
  intro?: string;
  items: string[];
};

/* --------------------------------------------- 1. Interview preparation */

export const interviewPrep: SectionIntro & {
  blocks: GuidanceBlock[];
  link: { label: string; href: string };
} = {
  eyebrow: "Interview preparation",
  heading: "Turning up ready",
  intro:
    "Two different conversations, and they want different things from you. A screening call establishes whether a role is worth either side's time. An employer interview is where you have to be specific about work you have actually done.",
  blocks: [
    {
      id: "screening-call",
      heading: "Before a screening call",
      intro:
        "This is the first conversation, and it is short. Have these to hand so none of it has to be looked up afterwards.",
      items: [
        "The compensation you would accept, as a range you have actually thought about rather than a number you will regret saying.",
        "Your notice period, and any date you cannot start before.",
        "Whether you need sponsorship to work in the US. A yes is not a problem to hide; it changes which roles are worth sending you.",
        "How far you are willing to travel, and whether onsite, hybrid or remote is a preference or a hard requirement.",
        "The licences, certifications and clearances you hold, with the states or jurisdictions they cover.",
        "Any employer you do not want to be submitted to, and why. It is easier to say at the start than to unwind later.",
      ],
    },
    {
      id: "employer-interview",
      heading: "Before an interview with the employer",
      intro:
        "Preparation here is mostly recall. The questions will be about work you have done, and the answers are more convincing when the detail is ready.",
      items: [
        "Three or four pieces of work you can describe end to end: what the situation was, what you decided, what you did, and how it turned out. Include one that did not go well.",
        "The shape of the team around you in each of those, and which part was yours rather than the team's.",
        "Why you left each role, in a sentence you are comfortable saying out loud.",
        "Questions of your own about the work itself - who you would report to, how the team is structured, what the first months would involve.",
        "The practical details: who you are meeting, in what format, and how long it is scheduled for.",
        "If it is a remote interview, the link tested on the device you will actually use.",
      ],
    },
    {
      id: "after",
      heading: "Afterwards",
      items: [
        "Write down what you were asked while it is fresh. The same questions recur across employers in the same discipline.",
        "Tell your recruiter how it went before they tell you. Your read on the conversation is worth more than the employer's summary of it.",
        "If you have changed your mind about the role, say so early rather than letting an offer arrive you do not want.",
      ],
    },
  ],
  link: {
    label: "How applying works, step by step",
    href: "/job-seekers#how-applying-works",
  },
};

/* --------------------------------------------------- 2. Resume guidance */

export const resumeGuidance: SectionIntro & {
  blocks: GuidanceBlock[];
  link: { label: string; href: string };
} = {
  eyebrow: "Resume guidance",
  heading: "Writing a resume that can be read quickly",
  intro:
    "A first pass is trying to answer four questions: can you do the job, are you available, are you licensed or qualified for it, and how does anyone reach you. Make all four answerable without hunting.",
  blocks: [
    {
      id: "structure",
      heading: "Structure",
      items: [
        "Name, city and state, phone and email at the top. Not in a header or a footer, where some systems will not read them.",
        "A short line saying what you do and what you are looking for, if the two differ.",
        "Roles in reverse date order, each with the employer, your title, and the month and year you started and finished.",
        "Dates on every role. A missing date reads as something being hidden even when it is not.",
        "Length follows the work: enough to show what you have done, and no more. What is right differs by discipline, so do not cut a clinical history to fit a rule you read somewhere.",
      ],
    },
    {
      id: "content",
      heading: "What to put in each role",
      items: [
        "What you were responsible for, distinguished from what your team was responsible for.",
        "The setting: the kind of employer, the size and shape of the operation, who you worked alongside.",
        "The tools, systems and methods you actually used, not the ones that were in the building.",
        "Outcomes where you can describe them honestly without inventing a measurement.",
        "Gaps, briefly explained. An unexplained gap invites a worse assumption than the real reason usually is.",
      ],
    },
    {
      id: "avoid",
      heading: "What gets in the way",
      items: [
        "Multi-column layouts, text inside images, and tables. They read fine to you and badly to software.",
        "Acronyms that are specific to one employer, with no expansion anywhere.",
        "A skills list with no roles attached to the skills.",
        "Titles that describe internal grades rather than the job. Put the real job alongside the internal title.",
        "Photographs, dates of birth, marital status and similar personal details. They are not asked for here and they are not wanted on an application.",
      ],
    },
  ],
  link: {
    label: "Send us your resume",
    href: "/job-seekers/upload-resume",
  },
};

/* --------------------------------------------- 3. Desk-specific guidance */

export type DeskGuidance = {
  /** Desk id from content/taxonomy.ts. */
  deskId: string;
  items: string[];
};

export const deskSection: SectionIntro & {
  guidance: DeskGuidance[];
  /** Appended after each desk name, built from the taxonomy. */
  coversLabel: string;
} = {
  eyebrow: "By desk",
  heading: "What matters on each desk",
  intro:
    "The general guidance above applies everywhere. These are the details that carry extra weight in each discipline, and the ones most often left off.",
  coversLabel: "Covers",
  guidance: [
    {
      deskId: "healthcare",
      items: [
        "Every licence and certification by name, with the issuing state and the expiry date. If you hold a multistate or compact licence, say which states it covers.",
        "Certifications that are conditions of the role, such as BLS or ACLS, with their renewal dates.",
        "The setting and the unit type, not just the employer. Acute, ambulatory, post-acute and specialty units are different jobs under the same title.",
        "Charting and clinical systems you have used, and whether you were a trainer or superuser on any of them.",
        "Credentialing takes time and it starts from documents. Having licences, immunisation records and references ready shortens the gap between an offer and a start date more than anything else you can control.",
      ],
    },
    {
      deskId: "technology",
      items: [
        "The stack you personally worked in, separated from the stack the company ran.",
        "What you owned: a service, a component, a migration, an on-call rotation. Ownership is more informative than a list of technologies.",
        "The delivery model and where you sat in it - product team, platform team, internal IT, agency.",
        "Whether the environment was cloud, on-premises or in the middle of moving, because the work is not the same.",
        "Clearances or compliance environments you have worked under, if any.",
      ],
    },
    {
      deskId: "professional",
      items: [
        "The systems you worked in by name, and which modules of them.",
        "The scope you were accountable for, described in what you did rather than what it was worth.",
        "Where you sat in the cycle - close, payroll, hiring, renewal - and what you owned within it.",
        "Licences, memberships and qualifications with their standing, including anything in progress.",
        "For trades roles, tickets, cards and safety certifications with their expiry dates.",
      ],
    },
  ],
};

/** Desk name plus its specialties, built from the taxonomy. */
export function deskCovers(deskId: string): string {
  return subSpecialtyNamesSentence(deskId);
}

/** Desk display name, for the heading above each block. */
export function deskLabel(deskId: string): string {
  return specialtyAreas.find((area) => area.id === deskId)?.name ?? deskId;
}

/* --------------------------------------------------------- 4. CTA band */

export const resourcesCta: CtaBandContent = {
  heading: "Ready when you are",
  description:
    "Send us your resume and a recruiter who works your discipline reads it. Nothing goes to an employer until you have agreed to the submission.",
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
    "No account to create, and asking a question costs nothing.",
};
