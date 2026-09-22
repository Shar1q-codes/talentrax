/**
 * /contact copy and form configuration.
 *
 * CONTENT RULE: every label, hint, legend, option and error message the form
 * renders comes from this file. ContactForm.tsx owns layout, state and
 * validation; it owns no words.
 *
 * NO CONTACT DETAILS ARE RENDERED. There is no confirmed email address,
 * phone number or postal address for this business - everything in
 * content/site.ts is still `isPlaceholder: true`, including a 555 number
 * reserved for fiction and a mailbox that does not exist. So this page shows
 * none of them, rather than an invented one or a "to be confirmed" line
 * (CLAUDE.md rule 6). CLIENT-CONFIRM.md item 8 is the blocker.
 *
 * The form is the fallback, not the main route. An employer with a role and
 * a candidate with a resume are the two things people actually arrive here
 * to do, and both have a purpose-built form elsewhere; this page sends them
 * there first and keeps the general form for everything else.
 */

import type { FieldConfig } from "./request-talent";

export const CONTACT_PATH = "/contact";

export const contactMeta = {
  title: "Contact Us",
  description:
    "Reach the Talentrax Global team. Employers with a role to fill and candidates with a resume have their own forms; everything else goes through this one.",
};

export const contactHero = {
  eyebrow: "Company",
  heading: "Get in touch",
  intro:
    "If you are hiring or looking for work, the two links below reach the right desk faster than a general message will. For anything else, the form is read by a person.",
};

/* -------------------------------------------- Route the two real intents */

export type IntentCard = {
  id: string;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
};

export const intents = {
  heading: "Most people are here for one of these",
  cards: [
    {
      id: "employer",
      title: "You have a role to fill",
      description:
        "Tell us the title, the specialty and where it sits, and a recruiter from the matching desk picks it up with a market read on the band.",
      linkLabel: "Request talent",
      href: "/employers/request-talent",
    },
    {
      id: "candidate",
      title: "You are looking for work",
      description:
        "Send your resume once. A recruiter who works your discipline reads it, and nothing goes to an employer until you have agreed to the submission.",
      linkLabel: "Upload your resume",
      href: "/job-seekers/upload-resume",
    },
  ] satisfies IntentCard[],
};

/* ----------------------------------------------------------------- Fields */

export const contactFields = {
  fullName: {
    id: "contact-name",
    label: "Full name",
    autoComplete: "name",
    required: true,
    errorRequired: "Enter your full name.",
  },
  email: {
    id: "contact-email",
    label: "Email",
    hint: "Where we reply.",
    autoComplete: "email",
    required: true,
    errorRequired: "Enter your email address.",
    errorFormat: "Enter an email address in the format name@example.com.",
  },
  phone: {
    id: "contact-phone",
    label: "Phone",
    hint: "Optional. Only if you would rather we called.",
    autoComplete: "tel",
    required: false,
    errorFormat: "Enter a phone number with at least 10 digits.",
  },
  enquiryType: {
    id: "enquiry-type",
    label: "Are you an employer or a job seeker?",
    dataLabel: "Whether you contacted us as an employer or a job seeker",
    required: true,
    errorRequired: "Tell us whether you are an employer or a job seeker.",
  },
  subject: {
    id: "contact-subject",
    label: "Subject",
    hint: "A few words, so it reaches the right person.",
    autoComplete: "off",
    required: true,
    errorRequired: "Enter a subject.",
  },
  message: {
    id: "contact-message",
    label: "Message",
    required: true,
    errorRequired: "Enter your message.",
  },
} satisfies Record<string, FieldConfig>;

export const enquiryTypeOptions: {
  value: string;
  label: string;
  hint: string;
}[] = [
  {
    value: "employer",
    label: "Employer",
    hint: "Hiring, or thinking about it",
  },
  {
    value: "job-seeker",
    label: "Job seeker",
    hint: "Looking for work, or already working with us",
  },
];

/* --------------------------------------------------------------- The form */

export const contactForm = {
  heading: "Send us a message",
  intro:
    "For anything that is not a role to fill or a resume to send: a question, a complaint, a data request, or something we have not thought of.",
  fieldset: {
    legend: "Your message",
    hint: "All of it goes to one inbox that a person reads.",
  },
  selectPlaceholder: "Choose one",
  required: {
    legend: "Fields marked with an asterisk are required.",
    marker: "*",
  },
  errorSummary: {
    title: "There is a problem with this form",
    intro: "Check the following and try again:",
  },
  submit: {
    label: "Send message",
    busyLabel: "Sending...",
  },
  success: {
    title: "Message received",
    body: "Thanks - your message is with us and a person will come back to you at the email address you gave.",
    note: "This site has no backend yet, so nothing was transmitted. The payload was written to the browser console instead.",
    resetLabel: "Send another message",
    backLabel: "Back to home",
  },
  privacyNote:
    "We use what you send to reply to you and nothing else. No third-party analytics or tracking runs on this site.",
  spam: {
    honeypotId: "contact-reference",
    honeypotLabel: "Reference code",
    minSubmitSeconds: 3,
  },
};
