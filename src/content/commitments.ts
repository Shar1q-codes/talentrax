/**
 * The promises the business makes. One wording, read by every page.
 *
 * These used to be written twice: once for employers on /employers and once
 * for candidates on /job-seekers, in different words. Two versions of the
 * same promise is how a business ends up making two different promises, and
 * /about would have made a third. So they live here, phrased so they read
 * correctly to either audience, and each page selects the ones it shows.
 *
 * Who renders what:
 *
 *   /about        namedRecruiter, consentBeforeSubmission, searchPlanFirst,
 *                 answerEitherWay
 *   /employers    namedRecruiter, consentBeforeSubmission, badNewsEarly,
 *                 termsInWriting
 *   /job-seekers  consentBeforeSubmission, youCanSeeWhoHasIt,
 *                 youCanHaveItDeleted
 *
 * A promise here is an operational commitment, not marketing: someone has to
 * keep it on every search. Adding one commits the company. See CLIENT-CONFIRM.md.
 *
 * NUMBERS: none, and none belong here. A commitment with a figure in it is a
 * statistic wearing a promise, which the content rules in CLAUDE.md forbid.
 */

import type { ProcessCommitment } from "./types";

export const commitments = {
  namedRecruiter: {
    id: "named-recruiter",
    title: "One named recruiter per search",
    detail:
      "Every role and every candidate has one recruiter, with a name and direct contact details, who stays with the search from brief to placement.",
  },

  consentBeforeSubmission: {
    id: "consent-before-submission",
    title: "No resume moves without consent",
    detail:
      "A candidate agrees to every submission before their resume is sent. Every time, for every role. Each submission is one candidate to one employer, made with that candidate's agreement and made once.",
  },

  searchPlanFirst: {
    id: "search-plan-first",
    title: "A search plan before sourcing starts",
    detail:
      "Every search opens with a written plan: where this talent sits, what comparable roles are paying, and which requirement will shrink the pool. It is agreed with the hiring team before anyone is approached.",
  },

  answerEitherWay: {
    id: "answer-either-way",
    title: "An answer either way",
    detail:
      "Candidates hear the outcome whether or not it went their way, with the employer's reason where we are allowed to share it. It is part of the job on every search.",
  },

  badNewsEarly: {
    id: "bad-news-early",
    title: "The bad news comes early",
    detail:
      "If the band is wrong, the title is wrong or the role is not fillable as briefed, we say so at the search plan stage, while there is still time to act on it.",
  },

  termsInWriting: {
    id: "terms-in-writing",
    title: "Terms are in writing before we start",
    detail:
      "Fees, guarantee periods and payment schedules are agreed and signed before sourcing begins, so every figure on an invoice is one you have already seen and signed.",
  },

  youCanSeeWhoHasIt: {
    id: "you-can-see",
    title: "You can see who has it",
    detail:
      "Ask your recruiter and we will tell you which employers have received your resume and when we sent it. Where you have been put forward is yours to know, whenever you ask.",
  },

  youCanHaveItDeleted: {
    id: "you-can-delete",
    title: "You can have it deleted",
    detail:
      "Ask us to remove your resume and details and we will, on your word alone.",
  },
} satisfies Record<string, ProcessCommitment>;
