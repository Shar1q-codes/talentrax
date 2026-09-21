/**
 * Copy and field configuration for the /job-seekers/upload-resume form.
 *
 * CONTENT RULE: every label, hint, legend, option and error message the form
 * renders comes from this file. UploadResumeForm.tsx owns layout, state and
 * validation logic; it owns no words.
 *
 * The specialty and engagement-type options are DERIVED from the shared
 * taxonomy, the same arrays the Employers pages render, so a candidate can
 * never be offered a discipline we do not advertise recruiting for.
 *
 * NO EEO OR DEMOGRAPHIC FIELDS. Race, gender, veteran status and disability
 * are not collected here and must not be added. That data is collected
 * separately, later, in the ATS, physically apart from the application, so
 * that it cannot inform a screening decision. Work authorization is a plain
 * yes/no with no visa-type field for the same reason.
 */

import { engagementModels, specialtyAreas } from "./taxonomy";
import type { FieldConfig, OptionGroup, SelectOption } from "./request-talent";

export type { FieldConfig, OptionGroup, SelectOption };

/* ----------------------------------------------------------------- Fields */

export const aboutYouFields = {
  fullName: {
    id: "applicant-name",
    label: "Full name",
    autoComplete: "name",
    required: true,
    errorRequired: "Enter your full name.",
  },
  email: {
    id: "applicant-email",
    label: "Email",
    hint: "Where your recruiter will reply.",
    autoComplete: "email",
    required: true,
    errorRequired: "Enter your email address.",
    errorFormat: "Enter an email address in the format name@example.com.",
  },
  phone: {
    id: "applicant-phone",
    label: "Phone",
    hint: "We call before we submit you anywhere.",
    autoComplete: "tel",
    required: true,
    errorRequired: "Enter a phone number we can reach you on.",
    errorFormat: "Enter a phone number with at least 10 digits.",
  },
  city: {
    id: "applicant-city",
    label: "City",
    dataLabel: "The city you are based in",
    autoComplete: "address-level2",
    required: true,
    errorRequired: "Enter the city you are based in.",
  },
  state: {
    id: "applicant-state",
    label: "State",
    dataLabel: "The state you are based in",
    autoComplete: "address-level1",
    required: true,
    errorRequired: "Choose the state you are based in.",
  },
} satisfies Record<string, FieldConfig>;

export const workFields = {
  specialty: {
    id: "applicant-specialty",
    label: "The role or specialty you want",
    hint: "Pick the closest discipline. It decides which desk picks your resume up.",
    required: true,
    errorRequired: "Choose the specialty you are looking for work in.",
  },
  workAuthorization: {
    id: "work-authorization",
    label: "Are you authorized to work in the US without sponsorship?",
    dataLabel:
      "Whether you need sponsorship to work in the US - a yes or no, with no visa detail",
    required: true,
    errorRequired:
      "Tell us whether you need sponsorship to work in the US.",
  },
  engagementTypes: {
    id: "engagement-types",
    label: "Engagement types you would consider",
    hint: "Choose as many as apply. We will not put you forward for a type you did not pick.",
    required: true,
    errorRequired: "Choose at least one type of engagement.",
  },
  resume: {
    id: "resume-file",
    label: "Your resume",
    required: true,
    errorRequired: "Attach your resume.",
  },
  linkedinUrl: {
    id: "linkedin-url",
    label: "LinkedIn profile",
    hint: "Optional. Paste the full address of your profile.",
    autoComplete: "url",
    required: false,
    errorFormat: "Enter a full web address, starting with https://.",
  },
  message: {
    id: "applicant-message",
    label: "Anything else we should know",
    dataLabel: "Anything else you type into the message box",
    hint: "Optional. Shift preferences, locations you will not travel to, certifications in progress, notice period, anything that changes which roles are worth sending you.",
    required: false,
  },
} satisfies Record<string, FieldConfig>;

export const consentFields = {
  storeAndContact: {
    id: "consent-store",
    label:
      "I agree to Talentrax Global storing my resume and contacting me about roles I have asked to hear about.",
    required: true,
    errorRequired:
      "We cannot accept a resume without your consent to store it and contact you.",
  },
  futureRoles: {
    id: "consent-future",
    label:
      "You can also contact me about future roles beyond the ones I have selected here.",
    hint: "Optional. Leave it unchecked and we will only contact you about the engagement types and specialty above.",
    required: false,
  },
} satisfies Record<string, FieldConfig>;

/* ---------------------------------------------------------------- Options */

/** Derived from the shared taxonomy: one optgroup per desk. */
export const specialtyGroups: OptionGroup[] = specialtyAreas.map((area) => ({
  label: area.name,
  options: area.subSpecialties.map((sub) => ({
    value: `${area.id}:${sub.id}`,
    label: sub.name,
  })),
}));

/** Derived from the engagement models the Employers pages describe. */
export const engagementTypeOptions: SelectOption[] = engagementModels.map(
  (model) => ({ value: model.id, label: model.name }),
);

/**
 * Work authorization. A plain yes/no: we need to know whether a role
 * requiring sponsorship is off the table, and nothing beyond that. There is
 * deliberately no visa-type or country-of-origin field.
 */
export const workAuthorizationOptions: {
  value: string;
  label: string;
  hint: string;
}[] = [
  {
    value: "authorized",
    label: "Yes",
    hint: "I can work in the US without sponsorship",
  },
  {
    value: "needs-sponsorship",
    label: "No",
    hint: "I would need sponsorship now or in the future",
  },
];

/**
 * Resume upload constraints.
 *
 * The visible text and the validation limit are written separately on
 * purpose: the copy has to be editable without touching the logic. Change one
 * and change the other.
 */
export const resumeFile = {
  /** The `accept` attribute. A hint to the file picker, never a guarantee. */
  acceptAttribute: ".pdf,.doc,.docx",
  acceptedExtensions: [".pdf", ".doc", ".docx"],
  maxBytes: 5 * 1024 * 1024,
  /** Stated next to the control, not only in the accept attribute. */
  constraintText: "PDF, DOC or DOCX, up to 5 MB.",
  errorType: "Attach your resume as a PDF, DOC or DOCX file.",
  errorSize: "That file is larger than 5 MB. Attach a smaller one.",
  /** Shown once a file is chosen, so the choice is confirmed in text. */
  chosenLabel: "Attached:",
  clearLabel: "Remove file",
};

/* ------------------------------------------------------------ Page & form */

export const uploadResume = {
  eyebrow: "Job Seekers",
  heading: "Upload your resume",
  intro:
    "One form, then a recruiter who works your discipline reads it. Your resume is not sent to any employer until we have named them to you and you have agreed.",
  beforeYouStart: [
    "Read by a person on the desk that recruits your specialty",
    "Nothing is submitted to an employer without your say-so",
    "You can ask us to delete your resume at any time",
  ],
  fieldsets: {
    aboutYou: {
      legend: "About you",
      hint: "So we know who you are and where you are based.",
    },
    work: {
      legend: "The work you want",
      hint: "This decides which desk picks your resume up and which roles you hear about.",
    },
    consent: {
      legend: "Consent",
      hint: "The first is required to send us a resume. The second is yours to choose.",
    },
  },
  location: {
    legend: "Where you are based",
    hint: "Your own location, not a location you are willing to relocate to. Tell us about relocation in the message box.",
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
    label: "Send my resume",
    busyLabel: "Sending...",
  },
  success: {
    title: "Resume received",
    body: "Thanks - your resume is with the desk that recruits your specialty. A recruiter will come back to you at the email address you gave, either way.",
    note: "This site has no backend yet, so nothing was transmitted and no file left your device. The payload was written to the browser console instead.",
    resetLabel: "Send another resume",
    backLabel: "Back to Job Seekers",
  },
  privacyNote:
    "We use these details to represent you for work and nothing else. No third-party analytics or tracking runs on this site.",
  spam: {
    honeypotId: "current-employer-url",
    honeypotLabel: "Current employer website",
    minSubmitSeconds: 3,
  },
};
