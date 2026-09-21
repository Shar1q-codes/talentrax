/**
 * Legal pages: /privacy-policy and /terms.
 *
 * WHAT IS AND IS NOT HERE
 *
 * The "what we collect" and "consent" sections are DERIVED from the actual
 * form definitions in content/upload-resume.ts and content/request-talent.ts.
 * Add a field to either form and it appears in the privacy policy; rename one
 * and the policy renames with it. A privacy policy that lists fields by hand
 * is wrong the first time anyone edits a form.
 *
 * Everything this repo cannot know is ABSENT, not approximated and not marked
 * with a bracketed placeholder (CLAUDE.md rule 5). Retention periods, the
 * names of processors, the data-rights contact address, international
 * transfers, whether the business sells personal information, and the
 * governing-law state are all unanswered. Each one is a numbered question in
 * CLIENT-CONFIRM.md at the repo root, and the sentence that would have
 * carried it is simply not written. Where that empties a whole section, the
 * section is gone too - look for the OMITTED comments below.
 *
 * THIS IS NOT LEGAL ADVICE AND HAS NOT BEEN REVIEWED BY A LAWYER. See the
 * note at the top of CLIENT-CONFIRM.md: the resume upload form must not be
 * publicly reachable until it has been.
 */

import {
  contactFields,
  roleFields,
  type FieldConfig,
} from "./request-talent";
import { site } from "./site";
import {
  aboutYouFields,
  consentFields,
  resumeFile,
  workFields,
} from "./upload-resume";

/* --------------------------------------------------------- Document model */

export type LegalBlock =
  | { kind: "paragraph"; id: string; text: string }
  | { kind: "list"; id: string; intro?: string; items: string[] };

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocumentContent = {
  eyebrow: string;
  heading: string;
  intro: string;
  /** Plain-language note about what this document is, above the sections. */
  scopeNote?: string;
  sections: LegalSection[];
};

/* ------------------------------------------------------- Field derivation */

/**
 * How a field is named in prose. `dataLabel` exists for the handful whose
 * on-screen label is not a standalone noun ("Per", "Range minimum").
 */
function dataLabels(fields: Record<string, FieldConfig>): string[] {
  return Object.values(fields).map((field) => field.dataLabel ?? field.label);
}

const uploadFormFields = [
  ...dataLabels(aboutYouFields),
  ...dataLabels(workFields),
];

const requisitionFormFields = [
  ...dataLabels(contactFields),
  ...dataLabels(roleFields),
];

/** Accessible name and visible heading for the in-page contents nav. */
export const legalContentsLabel = "On this page";

/* ------------------------------------------------------- Route metadata */

export const legalMeta = {
  privacy: {
    title: "Privacy Policy",
    description: `How ${site.name} collects, uses and protects personal information, what the resume and requisition forms ask for, and the choices you have over your data.`,
  },
  terms: {
    title: "Terms of Use",
    description: `The terms governing use of the ${site.name} website, including acceptable use, accounts, and the limits of what submitting a resume creates.`,
  },
};

/* ------------------------------------------------------- Privacy policy */

export const privacyPolicy: LegalDocumentContent = {
  eyebrow: "Legal",
  heading: "Privacy policy",
  intro: `This explains what ${site.name} collects through this website, why, who else sees it, and what you can tell us to do about it.`,
  scopeNote:
    "It covers this website and the two forms on it. It does not cover what an employer does with your information after you have agreed to be submitted to them - that is their policy, not ours.",
  sections: [
    {
      id: "what-we-collect",
      heading: "What we collect",
      blocks: [
        {
          kind: "paragraph",
          id: "collect-intro",
          text: "Split by how it reached us. We collect nothing else through this site.",
        },
        {
          kind: "list",
          id: "collect-upload",
          intro:
            "When you upload a resume, the form asks you for the following. Everything except your LinkedIn profile and your message is required to submit it:",
          items: uploadFormFields,
        },
        {
          kind: "paragraph",
          id: "collect-resume-file",
          text: `We also receive the resume file itself, its filename and its size. Accepted formats are the ones the form states: ${resumeFile.constraintText}`,
        },
        {
          kind: "paragraph",
          id: "collect-no-eeo",
          text: "The form does not ask for your race, gender, age, veteran status, disability or date of birth, and it does not ask which visa you hold. The work authorization question is a yes or no about sponsorship and nothing more. Do not send that information in the message box either - we do not want it attached to an application.",
        },
        {
          kind: "list",
          id: "collect-requisition",
          intro:
            "When you send us a requisition as an employer, the form asks for:",
          items: requisitionFormFields,
        },
        {
          kind: "paragraph",
          id: "collect-visit",
          text: "When you simply visit the site, this site collects nothing. It sets no cookies, stores nothing in your browser, runs no analytics, no advertising tags, no session recording and no chat widget, and loads no scripts, fonts or images from anyone else's servers. There is nothing to opt out of because there is nothing running.",
        },
        // OMITTED: what the hosting provider's server logs retain, and for how
        // long. CLIENT-CONFIRM.md question 5.
      ],
    },

    {
      id: "why-we-collect-it",
      heading: "Why we collect it and what we do with it",
      blocks: [
        {
          kind: "paragraph",
          id: "why-upload",
          text: "A resume goes to the recruiter who works your discipline. They use it to judge whether the roles on that desk fit you, to contact you about them, and - once you have agreed to a named employer - to represent you to that employer.",
        },
        {
          kind: "paragraph",
          id: "why-requisition",
          text: "A requisition goes to the desk that recruits the specialty you picked. We use it to reply to you, to scope the role, and to run the search.",
        },
        {
          kind: "paragraph",
          id: "why-not",
          text: "We do not use any of it for advertising, and we run no advertising or analytics technology on this site to use it with.",
        },
        // OMITTED: whether the business sells or shares personal information
        // for cross-context behavioural advertising. CLIENT-CONFIRM.md
        // question 6. This is a mandatory disclosure under some US state
        // laws; it is the lawyer's sentence to write, not ours to guess.
      ],
    },

    {
      id: "consent-and-choices",
      heading: "Consent and your choices",
      blocks: [
        {
          kind: "paragraph",
          id: "consent-intro",
          text: "The upload form has two consent boxes. They are separate on purpose, both start unchecked, and only the first one is required.",
        },
        {
          kind: "paragraph",
          id: "consent-required",
          text: `Required: "${consentFields.storeAndContact.label}" Without it we cannot accept your resume, because storing it and contacting you is the whole of what we would be doing with it.`,
        },
        {
          kind: "paragraph",
          id: "consent-optional",
          text: `Optional: "${consentFields.futureRoles.label}" Leave it unchecked and we will only contact you about the specialty and engagement types you selected on the form. Nothing about your application changes either way.`,
        },
        {
          kind: "paragraph",
          id: "consent-per-submission",
          text: "Neither consent lets us send your resume to an employer. That is a separate decision each time: we name the employer and the role, and your resume goes to them only after you have said yes to that employer.",
        },
        {
          kind: "paragraph",
          id: "consent-withdraw",
          text: "You can withdraw either consent at any time, and withdrawing the required one means we delete what we hold. You do not have to give a reason.",
        },
        // OMITTED: the address to send a withdrawal or deletion request to.
        // CLIENT-CONFIRM.md question 3. Every contact detail in
        // content/site.ts is still isPlaceholder: true.
      ],
    },

    {
      id: "who-we-share-it-with",
      heading: "Who we share it with",
      blocks: [
        {
          kind: "paragraph",
          id: "share-employers",
          text: "Employers, one at a time, and only after you have agreed to that employer by name. We do not circulate resumes to a list of clients, and we do not submit the same person to the same employer through two routes.",
        },
        // OMITTED: the named service providers that process this data - the
        // applicant tracking system, email provider, file storage and
        // hosting. CLIENT-CONFIRM.md question 2. Naming them is required;
        // guessing at them is worse than saying nothing.
      ],
    },

    // OMITTED ENTIRELY: "How long we keep it". Retention periods are a client
    // decision and nothing in this repo implies one. CLIENT-CONFIRM.md
    // question 1. Rule 5: an empty section is not a section.

    {
      id: "your-rights",
      heading: "Your rights",
      blocks: [
        {
          kind: "list",
          id: "rights-list",
          intro: "Whatever else applies to you by law, these hold here:",
          items: [
            "You can ask what we hold about you, and we will tell you.",
            "You can ask for a copy of it.",
            "You can ask us to correct anything that is wrong.",
            "You can ask us to delete it, and we will, without asking you to justify it.",
            "You can ask which employers have received your resume and when we sent it.",
            "You will not be treated any differently for asking for any of the above. Exercising these does not affect how we represent you.",
          ],
        },
        // OMITTED: how to exercise them - the address, the inbox, who owns it,
        // and how long a response takes. CLIENT-CONFIRM.md question 3.
      ],
    },

    // OMITTED ENTIRELY: "How to contact us about your data". There is no
    // confirmed address to publish, so the section has no content, so it is
    // not here. CLIENT-CONFIRM.md question 3 - this is the most urgent one:
    // rights nobody can exercise are not rights.
  ],
};

/* ---------------------------------------------------------- Terms of use */

export const termsOfUse: LegalDocumentContent = {
  eyebrow: "Legal",
  heading: "Terms of use",
  intro: `These terms govern your use of this website. By using it, you accept them.`,
  scopeNote: `They cover the website only. If ${site.name} works with you as a client or places you in a role, that relationship is governed by a separate signed agreement - fees, guarantees, notice and everything else contractual live there, not on this page. Nothing here changes a signed agreement, and nothing here creates one.`,
  sections: [
    {
      id: "acceptable-use",
      heading: "Acceptable use",
      blocks: [
        {
          kind: "list",
          id: "acceptable-use-list",
          intro: "Use the site for its purpose. Do not:",
          items: [
            "Submit information that is untrue, or that belongs to someone else without their permission - including uploading another person's resume as your own.",
            "Use the forms to send bulk, automated or commercial messages.",
            "Attempt to gain access to any part of the site, or any system behind it, that is not open to you.",
            "Scrape, harvest or bulk-copy content or contact details from the site.",
            "Interfere with the site's operation, or use it in a way that breaks any law.",
          ],
        },
        {
          kind: "paragraph",
          id: "acceptable-use-consequence",
          text: "We can withdraw access to the site from anyone who does any of the above.",
        },
      ],
    },

    {
      id: "accounts",
      heading: "Accounts",
      blocks: [
        {
          kind: "list",
          id: "accounts-list",
          intro:
            "Where the site offers an account, you are responsible for it:",
          items: [
            "Give accurate details when you register, and keep them current.",
            "Keep your credentials to yourself. Anything done through your account is treated as done by you.",
            "Tell us as soon as you think someone else has access to it.",
            "We can suspend or close an account that is being used in breach of these terms.",
          ],
        },
      ],
    },

    {
      id: "submitting-a-resume",
      heading: "Submitting a resume or a requisition",
      blocks: [
        {
          kind: "paragraph",
          id: "no-employment",
          text: "Sending us a resume does not make you an employee, a contractor or an applicant for any particular job, and it does not create an employment relationship of any kind between you and us or between you and any employer.",
        },
        {
          kind: "paragraph",
          id: "no-guarantee",
          text: "It is not a guarantee of anything: not of placement, not of an interview, not of being submitted to any employer, and not of a role existing that matches what you are looking for. We decide which candidates to represent and which roles to put them forward for.",
        },
        {
          kind: "paragraph",
          id: "requisition-no-contract",
          text: "Sending us a requisition starts a conversation. It does not engage us, and it does not commit either side to anything until there is a signed agreement.",
        },
      ],
    },

    {
      id: "the-site-itself",
      heading: "The site itself",
      blocks: [
        {
          kind: "paragraph",
          id: "as-is",
          text: "The site is provided as it is. We keep it accurate and available as far as we reasonably can, but we do not promise it will be uninterrupted, error-free, or that everything on it is complete and current at the moment you read it. Descriptions of how we work are descriptions, not terms.",
        },
        {
          kind: "paragraph",
          id: "liability",
          text: "To the fullest extent the law allows, we are not liable for any indirect or consequential loss arising from your use of this website, or from your reliance on anything published on it.",
        },
      ],
    },

    // OMITTED ENTIRELY: "Governing law". Which state's law governs, and where
    // disputes are heard, is a client decision. CLIENT-CONFIRM.md question 7.

    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [
        {
          kind: "paragraph",
          id: "changes-text",
          text: "We update these terms from time to time. The version published here is the one that applies, so check it when it matters to you.",
        },
      ],
    },
  ],
};
