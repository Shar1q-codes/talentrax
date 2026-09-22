/**
 * Job Seekers section copy: /job-seekers and /job-seekers/upload-resume.
 *
 * CONTENT RULE: no string rendered in the Job Seekers section is typed inline
 * in a component. Components import an object from here and map over it.
 *
 * COPY STATUS: placeholder pending the client's real content. It is written
 * as plausible, specific staffing language, but it is NOT approved copy.
 *
 * NUMBERS: none. No placement counts, response-time promises, percentages or
 * years-in-business claims. The only numbers in this section are the upload
 * form's own constraints (accepted file size), which are not claims.
 *
 * SHARED DATA: the three desks come from content/taxonomy.ts, the same array
 * the Employers page renders. The engagement type checkboxes on the upload
 * form come from the same engagement models. Neither is retyped here.
 */

import { commitments } from "./commitments";
import type { Cta, CtaBandContent, ProcessContent, SectionIntro } from "./types";

/* ----------------------------------------------------------- Shared paths */

export const JOB_SEEKERS_PATH = "/job-seekers";
export const UPLOAD_RESUME_PATH = "/job-seekers/upload-resume";
export const JOBS_PATH = "/jobs";

/**
 * The privacy page. Still a coming-soon route, but the consent section has to
 * point somewhere real: linking to a path with no route would break the rule
 * that every href resolves.
 */
export const PRIVACY_PATH = "/privacy-policy";

/* ------------------------------------------------------- Route metadata */

export const jobSeekersMeta = {
  overview: {
    title: "For Job Seekers",
    description:
      "Send Talentrax Global one resume, have a named recruiter read it, and get an answer either way. How applying works, what we recruit for, and what happens to your data.",
  },
  uploadResume: {
    title: "Upload Your Resume",
    description:
      "Send your resume to the Talentrax Global recruiting team. Tell us the discipline you work in and the kind of engagement you want, and the matching desk picks it up.",
  },
};

/* ------------------------------------------------------ 1. /job-seekers hero */

export const jobSeekersHero: SectionIntro & { ctas: Cta[] } = {
  eyebrow: "For Job Seekers",
  heading: "Apply once. A person reads it. You get an answer either way.",
  intro:
    "Send us one resume and it goes straight to the recruiter who works your discipline. Every submission is made with your agreement, and you hear back from us either way.",
  ctas: [
    { label: "Upload your resume", href: UPLOAD_RESUME_PATH, variant: "primary" },
    // /jobs is still a coming-soon route. It is linked like any other route
    // on this site: the page itself explains and offers a way onward, which
    // is the treatment every unbuilt route gets.
    { label: "Browse open roles", href: JOBS_PATH, variant: "secondary" },
  ],
};

/* ------------------------------------------------- 2. How applying works */

export const applyProcess: ProcessContent = {
  eyebrow: "How applying works",
  heading: "Five steps, and you always know which one you are on",
  intro:
    "This is what happens to your resume, and what you have in hand at each step.",
  /** Column heading inside each step. Outcomes only: see types.ts. */
  labels: {
    youGet: "What you get",
  },
  steps: [
    {
      id: "send",
      number: "01",
      title: "You send it once",
      summary:
        "One resume, one form, and it covers every role we run in your discipline.",
      youGet: [
        "Confirmation that it arrived and which desk has it",
        "One record we keep current for every role you are considered for",
        "No account to create",
      ],
    },
    {
      id: "read",
      number: "02",
      title: "A recruiter reads it",
      summary:
        "A person who recruits your discipline reads your resume and knows what your certifications mean.",
      youGet: [
        "An assessment from someone who has placed your role before",
        "A straight answer if your target is not realistic in this market",
        "The name of the recruiter holding your file",
      ],
    },
    {
      id: "talk",
      number: "03",
      title: "We talk before anything moves",
      summary:
        "A conversation about what you actually want: compensation, schedule, commute, the kind of team you work well in, and what would make you turn a role down.",
      youGet: [
        "A real conversation about what you want",
        "What the market is paying for your profile, and honest information about pay bands, shift patterns and team structure",
        "The ability to rule employers or role types out before we start",
      ],
    },
    {
      id: "submit",
      number: "04",
      title: "You approve every submission",
      summary:
        "When a role fits, we tell you what the job is and what it pays, and we ask. Your resume moves only when you say yes to that submission.",
      youGet: [
        "Control over every submission made on your behalf",
        "Every submission agreed in advance, and each employer approached once",
        "Interview preparation from the recruiter who briefed the hiring manager",
      ],
    },
    {
      id: "answer",
      number: "05",
      title: "You get an answer either way",
      summary:
        "Yes or no, you hear it from us, and you hear why. It is part of the job on every search.",
      youGet: [
        "An actual answer, including when the answer is no",
        "The employer's feedback in their words where we are allowed to share it",
        "A recruiter who keeps working your file after a rejection",
      ],
    },
  ],
};

/* ----------------------------------------------- 3. What we recruit for */

export const jobSeekerSpecialtySection: SectionIntro = {
  eyebrow: "What we recruit for",
  heading: "Three desks, and the disciplines on each",
  intro:
    "If your discipline is on this list, a recruiter here works it full time. If it is not, tell us anyway and you will get a straight answer about whether we can help.",
};

/* ----------------------------------------- 4. Your data and your consent */

export const consentSection = {
  eyebrow: "Your data and your consent",
  heading: "Your resume moves on your say-so",
  intro:
    "A resume is a personal document and it stays yours. Three things hold on every search, without you having to ask.",
  // Shared wording, from content/commitments.ts. The first of these is the
  // same promise /employers and /about make, in the same words.
  promises: [
    commitments.consentBeforeSubmission,
    commitments.youCanSeeWhoHasIt,
    commitments.youCanHaveItDeleted,
  ],
  privacyLinkIntro: "The full detail of what we hold and why is in our",
  privacyLinkLabel: "privacy policy",
};

/* ------------------------------------------------------- 5. Closing CTA band */

export const jobSeekersCta: CtaBandContent = {
  heading: "Send us your resume",
  description:
    "One upload, read by a recruiter who works your discipline. You decide where it goes after that.",
  ctas: [
    { label: "Upload your resume", href: UPLOAD_RESUME_PATH, variant: "inverse" },
    { label: "Browse open roles", href: JOBS_PATH, variant: "outline-inverse" },
  ],
  footnote:
    "No account to create. Every submission of your resume is one you have agreed to.",
};
