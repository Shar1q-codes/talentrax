/**
 * /faq content.
 *
 * EVERY ANSWER HERE IS ALREADY TRUE SOMEWHERE ELSE ON THIS SITE. Nothing was
 * invented to fill the page out. Each one restates, in question form, content
 * that exists on /employers, /job-seekers, /about, /privacy-policy, or in
 * content/taxonomy.ts and content/commitments.ts - and links to the fuller
 * version. An FAQ is the easiest page on a site to quietly make things up on,
 * because a plausible answer reads exactly like a sourced one.
 *
 * QUESTIONS WE LEFT OUT. Several obvious ones have no answer anywhere in this
 * repo: how long a resume is kept, how to reach us to exercise a data right,
 * how quickly anyone replies, whether we place outside the US. They are
 * listed under CLIENT-CONFIRM.md item 10 and they are NOT on the page. Eight
 * real answers beat twelve with four guesses in them.
 *
 * NO COMMERCIAL OR FEE QUESTIONS. Those terms are not agreed, are not
 * published on /employers/services, and are not going to debut in an FAQ.
 *
 * The FAQPage structured data is generated from this same array, so the
 * markup and the page cannot disagree - see src/lib/faq-schema.ts.
 */

import { commitments } from "./commitments";
import {
  deskNamesSentence,
  engagementNamesSentence,
  specialtyAreas,
} from "./taxonomy";
import type { CtaBandContent } from "./types";

export type FaqItem = {
  id: string;
  question: string;
  /** Plain-text paragraphs. Rendered as <p>; joined for the JSON-LD answer. */
  answer: string[];
  /** The fuller version of this answer, elsewhere on the site. */
  link?: { label: string; href: string };
};

export type FaqGroup = {
  id: string;
  heading: string;
  intro: string;
  items: FaqItem[];
};

export const faqMeta = {
  title: "Frequently Asked Questions",
  description:
    "Common questions about working with Talentrax Global as an employer or as a candidate: how a search runs, what happens to your resume, consent, and what we recruit for.",
};

/** Accessible name for the jump list in the masthead. */
export const faqGroupsNavLabel = "Question groups";

export const faqHero = {
  eyebrow: "Company",
  heading: "Frequently asked questions",
  intro:
    "Answers to what employers and candidates ask most. Every one of them links to the fuller version on the page it comes from.",
};

export const faqGroups: FaqGroup[] = [
  {
    id: "for-employers",
    heading: "For employers",
    intro: "Hiring, or thinking about it.",
    items: [
      {
        id: "what-do-you-recruit-for",
        question: "What kinds of roles do you recruit for?",
        answer: [
          `We run ${specialtyAreas.length} desks: ${deskNamesSentence()}. Each one has its own recruiters who work that discipline and nothing else, which is how they learn which credentials matter and which titles mean the same job at different employers.`,
          "Every desk lists the disciplines it covers, so you can check whether your role is one we actually place before you spend time on a brief.",
        ],
        link: { label: "See the three desks", href: "/employers#specialties" },
      },
      {
        id: "how-can-we-engage-you",
        question: "How can we engage you?",
        answer: [
          `Three ways: ${engagementNamesSentence()}. Direct hire is a permanent search run against criteria you sign off. Contract puts credentialed talent on our payroll for a defined engagement. Executive search is a retained, research-led search for leadership roles, assessed against a scorecard you agree before it opens.`,
          "Each model is set out in full, including how the commercial arrangement works in plain terms.",
        ],
        link: {
          label: "Compare the engagement models",
          href: "/employers/services",
        },
      },
      {
        id: "what-happens-after-we-brief-you",
        question: "What happens after we send you a role?",
        answer: [
          "A five-step process, the same on every engagement: intake and role scoping, a market read and written search plan, sourcing and screening, shortlist and interviews, then offer, close and start.",
          "Each step sets out both what we do and what you receive from it, so you can see where a search has got to rather than having to ask.",
        ],
        link: {
          label: "Read how a search runs",
          href: "/employers#how-a-search-runs",
        },
      },
      {
        id: "search-plan-first",
        question: "Do we see a plan before you start contacting people?",
        answer: [
          commitments.searchPlanFirst.detail,
          "If the search is not viable as briefed, you can stop there at no cost.",
        ],
        link: {
          label: "See the search plan step",
          href: "/employers#how-a-search-runs",
        },
      },
      {
        id: "who-do-we-deal-with",
        question: "Who will we actually be dealing with?",
        answer: [commitments.namedRecruiter.detail],
        link: { label: "How we work", href: "/about#how-we-work" },
      },
      {
        id: "role-not-fillable",
        question: "What if the role cannot be filled as we have written it?",
        answer: [
          commitments.badNewsEarly.detail,
          "The market read at the search plan stage is where a band, a title or a work mode gets challenged, because that is while it is still cheap to change.",
        ],
        link: {
          label: "See the market read step",
          href: "/employers#how-a-search-runs",
        },
      },
      {
        id: "how-do-we-send-a-role",
        question: "How do we send you a role?",
        answer: [
          "Through the requisition form. It asks for the job title, the service you need, the specialty, the location and work mode, how many positions, and optionally a target start date and a salary or rate range.",
          "The range is optional but it is the most useful thing on the form: it is what lets us tell you straight away whether the band will land the profile you have described.",
        ],
        link: { label: "Request talent", href: "/employers/request-talent" },
      },
    ],
  },

  {
    id: "for-candidates",
    heading: "For candidates",
    intro: "Looking for work, or already working with us.",
    items: [
      {
        id: "how-do-i-apply",
        question: "How do I apply?",
        answer: [
          "Upload your resume once. The form asks for your name, contact details, where you are based, the specialty you want, whether you need sponsorship to work in the US, and which engagement types you would consider.",
          "Resumes are accepted as PDF, DOC or DOCX, up to 5 MB.",
        ],
        link: {
          label: "Upload your resume",
          href: "/job-seekers/upload-resume",
        },
      },
      {
        id: "do-i-need-an-account",
        question: "Do I need to create an account?",
        answer: [
          "No. There is no portal to register for, no password, and no application to re-key. You send one resume and it goes to the desk that recruits your discipline.",
        ],
        link: {
          label: "How applying works",
          href: "/job-seekers#how-applying-works",
        },
      },
      {
        id: "what-happens-to-my-resume",
        question: "What happens after I send my resume?",
        answer: [
          "Five steps: you send it once, a recruiter who works your discipline reads it, we talk about what you actually want before anything moves, you approve every submission, and you get an answer either way.",
          "A person reads it. It is not matched by a keyword filter and then forgotten.",
        ],
        link: {
          label: "Read how applying works",
          href: "/job-seekers#how-applying-works",
        },
      },
      {
        id: "consent-before-submission",
        question: "Will my resume be sent to employers without asking me?",
        answer: [
          commitments.consentBeforeSubmission.detail,
          "That decision is separate from agreeing to let us store your resume. Neither consent on the upload form allows us to send it anywhere on its own.",
        ],
        link: {
          label: "Your data and your consent",
          href: "/job-seekers#your-data",
        },
      },
      {
        id: "what-am-i-consenting-to",
        question: "What am I agreeing to when I tick the consent boxes?",
        answer: [
          "There are two, and they are separate on purpose. The first is required: it lets us store your resume and contact you about roles of the kind you selected. The second is optional and starts unchecked: it lets us contact you about roles beyond those.",
          "Leaving the optional one unchecked changes nothing about your application.",
        ],
        link: {
          label: "Consent and your choices",
          href: "/privacy-policy#consent-and-choices",
        },
      },
      {
        id: "will-i-hear-back",
        question: "Will I hear back if I am not selected?",
        answer: [commitments.answerEitherWay.detail],
        link: {
          label: "See the final step",
          href: "/job-seekers#how-applying-works",
        },
      },
      {
        id: "who-has-my-resume",
        question: "Can I find out which employers have my resume, or have it deleted?",
        answer: [
          `${commitments.youCanSeeWhoHasIt.detail} ${commitments.youCanHaveItDeleted.detail}`,
          "You can also ask what we hold, ask for a copy, and ask us to correct anything wrong. Asking for any of it does not change how we represent you.",
        ],
        link: { label: "Your rights", href: "/privacy-policy#your-rights" },
      },
      {
        id: "what-you-do-not-ask",
        question: "What do you ask about work authorization?",
        answer: [
          "One yes or no: whether you can work in the US without sponsorship. There is no visa-type field and no question about where you are from.",
          "The application form also asks nothing about your race, gender, age, veteran status, disability or date of birth. That information is collected separately and later, away from anything that could inform a screening decision.",
        ],
        link: {
          label: "What we collect",
          href: "/privacy-policy#what-we-collect",
        },
      },
      {
        id: "no-jobs-listed",
        question: "Why are no roles listed on the job board?",
        answer: [
          "Most of our searches are filled from candidates already on file and never reach a public board, so the board is often quiet. Being on file is the move that matters.",
          "When something is posted here, it is open. We would rather show an empty board than pad it with roles that are already filled or were never real.",
        ],
        link: { label: "See the board", href: "/jobs" },
      },
    ],
  },
];

export const faqCta: CtaBandContent = {
  heading: "Not answered here?",
  description:
    "Ask. A question costs nothing and reaches a person rather than a queue.",
  ctas: [
    { label: "Contact us", href: "/contact", variant: "inverse" },
    {
      label: "Upload your resume",
      href: "/job-seekers/upload-resume",
      variant: "outline-inverse",
    },
  ],
  footnote:
    "Employers with a role to fill and candidates with a resume both have a form that reaches the right desk directly.",
};
