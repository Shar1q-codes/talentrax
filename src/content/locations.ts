/**
 * /locations content.
 *
 * THIS PAGE HAS NO MARKET LIST, AND DOES NOT NEED ONE. The question someone
 * arrives with is not "which cities do you have offices in" - it is "can you
 * help me where I am, and how does location work for these roles". That is
 * what the page answers.
 *
 * HARD LIMITS, all of them deliberate:
 *   - No state names, no cities, no regions, no metro areas.
 *   - No counts of markets, offices or coverage areas, and no quantities of
 *     any kind. The no-statistics rule.
 *   - No map, no office addresses, no phone numbers.
 *   - NO REGULATORY DETAIL. Licensure and multistate arrangements are
 *     mentioned as things that affect a role, and that is where it stops.
 *     This file must not name compact member states, claim which licences
 *     transfer where, or characterise any board's rules. Those change, this
 *     page would not, and being wrong about licensure on a healthcare
 *     staffing site is worse than saying nothing.
 *   - No relocation policy. Whether relocation is offered, and by whom, is
 *     the employer's to state on their posting.
 *
 * DERIVED: the work arrangements come from the requisition form's own
 * options in content/request-talent.ts, so the page explains exactly the
 * arrangements an employer can actually specify.
 */

import { workModeOptions } from "./request-talent";
import type { CtaBandContent, SectionIntro } from "./types";

export const LOCATIONS_PATH = "/locations";

export const locationsMeta = {
  title: "Locations",
  description:
    "Talentrax Global recruits across the United States. How location works on a role, what licensure means for clinical work, and where to find the location of any specific opening.",
};

export const locationsHero = {
  eyebrow: "Job Seekers",
  heading: "Recruiting across the United States",
  intro:
    "The short answer is yes, wherever you are, provided the role and you line up. Location belongs to the role, and this page explains what that means in practice.",
};

/* ------------------------------------------------- 1. Nationwide, no list */

export const nationwide: SectionIntro & { body: string[] } = {
  eyebrow: "Coverage",
  heading: "Nationwide, by discipline",
  intro:
    "We recruit and place throughout the United States. Each desk works its discipline nationally, so wherever a role sits, it is covered.",
  body: [
    "What matters is whether the requirement and the candidate line up, and location is one part of that.",
    "A role is in a market because an employer has a requirement there.",
  ],
};

/* ------------------------------------------- 2. How location works on a role */

export const onRole: SectionIntro & {
  /** Derived from the requisition form's own work-mode options. */
  modes: { value: string; label: string; hint: string }[];
  body: string[];
  link: { label: string; href: string };
} = {
  eyebrow: "On a role",
  heading: "Location is set by the role",
  intro:
    "Onsite, hybrid and remote are the employer's requirement, set when the role is briefed. They can differ between two roles at the same employer, and they hold as the employer set them.",
  modes: workModeOptions,
  body: [
    "Every posting carries its own location and its own work arrangement, and the posting is the authoritative answer for that role. If a listing and this page ever disagree, the listing is right.",
    "If a role is remote, the posting says what that actually means: fully remote, remote within reach of a site, or remote with travel. Those are different jobs and it is worth reading which one you are looking at.",
  ],
  link: { label: "See open roles", href: "/jobs" },
};

/* ---------------------------------------- 3. Healthcare licensure and location */

export const clinical: SectionIntro & { body: string[]; note: string } = {
  eyebrow: "Clinical roles",
  heading: "What location means for licensed work",
  intro:
    "For clinical roles, where you can work is shaped by where you are licensed, and licensure is granted state by state. Multistate and compact arrangements exist and change what that means for some professions, so a clinical posting states its own requirement.",
  body: [
    "Read the requirement on the posting. It says which licence or certification the role needs and which state it has to be valid in. If yours covers it, say so when you apply. If it does not, tell us anyway - the same desk usually has work that it does fit.",
    "Where a role needs licensure, we verify it before you are submitted anywhere, so it is worth having the detail to hand: the licence, the issuing state, the expiry date, and the states it covers if it is a multistate one.",
  ],
  // The line that keeps this page out of regulatory territory. It stays.
  note: "We do not give licensure advice and nothing here is a statement of what any board permits. Rules differ by profession and by state and they change. Your issuing board is the authority on your licence; the posting is the authority on the role.",
};

/* ------------------------------------------------------------ 4. Relocation */

export const relocation: SectionIntro & { body: string[] } = {
  eyebrow: "Relocation",
  heading: "If a role involves moving",
  intro:
    "Some roles do. Whether relocation is part of a role, and what the employer offers with it, is the employer's to say - so it is on the posting, and it is a conversation with your recruiter.",
  body: [
    "If you are willing to relocate, tell us where and under what conditions when you send your resume. It widens what we can put in front of you, and it is best said at the start.",
  ],
};

/* ---------------------------------------------------------- 5. For employers */

export const forEmployers: SectionIntro & {
  body: string[];
  link: { label: string; href: string };
} = {
  eyebrow: "For employers",
  heading: "Your requisition sets the location",
  intro:
    "Wherever the role sits, that is where we recruit for it, and every market is one we cover.",
  body: [
    "Tell us the city and state the role is based in and whether it is onsite, hybrid or remote, and the search is built around that. Where a location makes a requirement harder to fill, you hear it at the search plan stage.",
  ],
  link: { label: "Send us a requisition", href: "/employers/request-talent" },
};

/* --------------------------------------------------------------- CTA band */

export const locationsCta: CtaBandContent = {
  heading: "Wherever you are",
  description:
    "Send us your resume and tell us where you can work, or send us a role and tell us where it sits. Both reach the desk that recruits the discipline.",
  ctas: [
    {
      label: "Upload your resume",
      href: "/job-seekers/upload-resume",
      variant: "inverse",
    },
    {
      label: "Request talent",
      href: "/employers/request-talent",
      variant: "outline-inverse",
    },
  ],
  footnote:
    "Every open role carries its own location and work arrangement on the posting.",
};
