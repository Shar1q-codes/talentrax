/**
 * /about copy.
 *
 * NUMBERS: none, and this page is where the temptation is worst. No founding
 * year, no years in business, no placements, no clients, no team size, no
 * offices, no growth. Not as a figure and not spelled out - "over a decade"
 * is the same claim in words. If a sentence here needs a quantity to work,
 * the sentence is wrong for this site. See "Content rules" in CLAUDE.md.
 *
 * DELIBERATELY ABSENT: a founder story, a mission block, leadership bios, an
 * office address, and any named person. An about page with no numbers and no
 * people has to earn its place on how the work is actually done, which is
 * what the "How we work" section is for - and that section's promises come
 * from content/commitments.ts, the same ones /employers and /job-seekers
 * make, so this page cannot quietly promise something different.
 *
 * DERIVED: the desks and the engagement models both come from
 * content/taxonomy.ts. Retire a model or a desk and this page follows.
 */

import { commitments } from "./commitments";
import { engagementModels } from "./taxonomy";
import type { CtaBandContent, ProcessCommitment, SectionIntro } from "./types";

/** "Direct Hire, Contract and Executive Search", built from the taxonomy. */
function listModelNames(): string {
  const names = engagementModels.map((model) => model.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const aboutMeta = {
  title: "About Us",
  description:
    "Who Talentrax Global is and how we work: one named recruiter per search, consent before any resume moves, a written search plan before sourcing, and an answer either way.",
};

export const aboutHero = {
  eyebrow: "Company",
  heading: "A staffing firm you can see into",
  intro:
    "Talentrax Global places clinical, technical and professional talent for US employers. We work for hiring teams who want one accountable recruiter instead of four agencies racing, and for candidates who want to know where their resume went and what happened to it.",
};

export const whatWeDo: SectionIntro & { body: string[]; modelsLine: string } = {
  eyebrow: "What we do",
  heading: "Placement, on three desks",
  intro:
    "We are a recruiting firm, not a job board and not a resume database. Someone here reads every resume and briefs every role.",
  body: [
    "Employers come to us with a role that has to be filled by a person who can actually do it. Candidates come to us because applying through a portal is a coin toss. Both sides get the same recruiter, who knows the discipline and has placed the role before.",
  ],
  /** Derived from taxonomy.ts so it cannot drift from the services page. */
  modelsLine: `The engagement models are ${listModelNames()}, and the commercial arrangement behind each one is set out in plain terms before any search opens.`,
};

export const aboutSpecialtySection: SectionIntro = {
  eyebrow: "Our desks",
  heading: "Three desks, each with its own recruiters",
  intro:
    "A recruiter sits on one desk and stays there. That is how they learn which credentials matter, which titles mean the same job at different employers, and which candidates are genuinely available rather than merely listed.",
};

/**
 * The substantive section. With no statistics and no testimonials permitted,
 * this is the whole credibility argument, and every promise in it is shared
 * word for word with the pages that already make it.
 */
export const howWeWork: SectionIntro & {
  commitments: ProcessCommitment[];
} = {
  eyebrow: "How we work",
  heading: "Four things that hold on every search",
  intro:
    "Not values, and not a pledge. These are operational: each one is something a recruiter here has to do on every role, and something you can hold us to when it does not happen.",
  commitments: [
    commitments.namedRecruiter,
    commitments.consentBeforeSubmission,
    commitments.searchPlanFirst,
    commitments.answerEitherWay,
  ],
};

export const whereWeRecruit: SectionIntro & { body: string[] } = {
  eyebrow: "Where we recruit",
  heading: "Across the United States",
  intro:
    "We recruit and place throughout the US, onsite, hybrid and remote.",
  body: [
    // No state list, no market count, no office locations: none of that is
    // confirmed, and an invented list of cities is exactly the kind of claim
    // the content rules exist to stop.
    "Where a role sits determines who is available for it and what it has to pay, so location is part of the brief from the first conversation rather than a filter applied at the end.",
  ],
};

export const aboutCta: CtaBandContent = {
  heading: "Start on either side",
  description:
    "Tell us about the role you need to fill, or send us your resume and let a recruiter who works your discipline read it.",
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
  footnote:
    "Not sure which? Either one reaches a person, and we will point you the right way.",
};
