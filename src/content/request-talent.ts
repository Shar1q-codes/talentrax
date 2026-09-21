/**
 * Copy and field configuration for the /employers/request-talent form.
 *
 * CONTENT RULE: every label, hint, legend, option and error message the form
 * renders comes from this file. RequestTalentForm.tsx owns layout, state and
 * validation logic; it owns no words.
 *
 * The service and specialty option lists are DERIVED from the engagement
 * models and specialty areas in content/employers.ts rather than retyped, so
 * the form can never drift out of step with the pages that describe them.
 */

import { engagementModels, specialtyAreas } from "./employers";

export type FieldConfig = {
  /** DOM id and form control name. Used for label htmlFor and error anchors. */
  id: string;
  label: string;
  /** Rendered under the label and wired in via aria-describedby. */
  hint?: string;
  /**
   * Autocomplete token. Fields that describe the ROLE rather than the person
   * filling in the form are "off" on purpose: prompting someone to autofill
   * their own city into a job location would be actively wrong.
   */
  autoComplete?: string;
  required: boolean;
  /** Announced when a required field is left empty. */
  errorRequired?: string;
  /** Announced when a value is present but malformed. */
  errorFormat?: string;
};

export type SelectOption = { value: string; label: string };
export type OptionGroup = { label: string; options: SelectOption[] };

/* ----------------------------------------------------------------- Fields */

export const contactFields = {
  fullName: {
    id: "full-name",
    label: "Full name",
    autoComplete: "name",
    required: true,
    errorRequired: "Enter your full name.",
  },
  workEmail: {
    id: "work-email",
    label: "Work email",
    hint: "We reply here, so a monitored address works best.",
    autoComplete: "email",
    required: true,
    errorRequired: "Enter your work email address.",
    errorFormat: "Enter an email address in the format name@company.com.",
  },
  phone: {
    id: "phone",
    label: "Phone",
    hint: "Direct line or mobile, whichever reaches you.",
    autoComplete: "tel",
    required: true,
    errorRequired: "Enter a phone number we can reach you on.",
    errorFormat: "Enter a phone number with at least 10 digits.",
  },
  companyName: {
    id: "company-name",
    label: "Company name",
    autoComplete: "organization",
    required: true,
    errorRequired: "Enter your company name.",
  },
  contactJobTitle: {
    id: "contact-job-title",
    label: "Your job title",
    autoComplete: "organization-title",
    required: false,
  },
} satisfies Record<string, FieldConfig>;

export const roleFields = {
  roleTitle: {
    id: "role-title",
    label: "Job title you are hiring for",
    hint: "The title as you would post it. We will tell you if the market reads it differently.",
    autoComplete: "off",
    required: true,
    errorRequired: "Enter the job title you are hiring for.",
  },
  service: {
    id: "service",
    label: "Service needed",
    required: true,
    errorRequired: "Choose the engagement model you need.",
  },
  specialty: {
    id: "specialty",
    label: "Specialty",
    hint: "Pick the closest discipline. The desk that owns it will pick the brief up.",
    required: true,
    errorRequired: "Choose the specialty this role sits in.",
  },
  city: {
    id: "city",
    label: "City",
    autoComplete: "off",
    required: true,
    errorRequired: "Enter the city the role is based in.",
  },
  state: {
    id: "state",
    label: "State",
    autoComplete: "off",
    required: true,
    errorRequired: "Choose the state the role is based in.",
  },
  workMode: {
    id: "work-mode",
    label: "Work mode",
    required: true,
    errorRequired: "Choose whether the role is onsite, hybrid or remote.",
  },
  positions: {
    id: "positions",
    label: "Number of positions",
    hint: "How many people you need in this role.",
    autoComplete: "off",
    required: true,
    errorRequired: "Enter how many positions you are filling.",
    errorFormat: "Enter a whole number of positions, one or more.",
  },
  startDate: {
    id: "start-date",
    label: "Target start date",
    hint: "An approximate date is fine. Leave blank if it is open.",
    autoComplete: "off",
    required: false,
    errorFormat: "Enter a target start date that is today or later.",
  },
  salaryMin: {
    id: "salary-min",
    label: "Range minimum",
    autoComplete: "off",
    required: false,
    errorFormat: "Enter the range minimum as a number.",
  },
  salaryMax: {
    id: "salary-max",
    label: "Range maximum",
    autoComplete: "off",
    required: false,
    errorFormat: "The range maximum must be the same as or higher than the minimum.",
  },
  salaryUnit: {
    id: "salary-unit",
    label: "Per",
    required: false,
    errorFormat: "Choose whether the range is hourly or annual.",
  },
  requirements: {
    id: "requirements",
    label: "Additional requirements",
    hint: "Credentials, shift pattern, certifications, tooling, interview process, anything that would make us discount an otherwise strong candidate.",
    autoComplete: "off",
    required: false,
  },
} satisfies Record<string, FieldConfig>;

/* ---------------------------------------------------------------- Options */

/** Derived from the engagement models so the two can never disagree. */
export const serviceOptions: SelectOption[] = engagementModels.map((model) => ({
  value: model.id,
  label: model.name,
}));

/** Derived from the specialty areas: one optgroup per desk. */
export const specialtyGroups: OptionGroup[] = specialtyAreas.map((area) => ({
  label: area.name,
  options: area.subSpecialties.map((sub) => ({
    value: `${area.id}:${sub.id}`,
    label: sub.name,
  })),
}));

export const workModeOptions: { value: string; label: string; hint: string }[] = [
  { value: "onsite", label: "Onsite", hint: "On location for every shift" },
  { value: "hybrid", label: "Hybrid", hint: "Split between site and remote" },
  { value: "remote", label: "Remote", hint: "No regular onsite requirement" },
];

export const salaryUnitOptions: SelectOption[] = [
  { value: "hour", label: "Per hour" },
  { value: "year", label: "Per year" },
];

/** US states and DC, for the role location select. */
export const usStates: SelectOption[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

/* ------------------------------------------------------------ Page & form */

export const requestTalent = {
  eyebrow: "Employers",
  heading: "Request talent",
  intro:
    "Tell us about the role. A recruiter from the matching desk picks the brief up and comes back to you with a market read on the band, a realistic timeline, and whether we think the role is fillable as written.",
  /** Reassurance list above the form. No figures, no response-time promises. */
  beforeYouStart: [
    "One named recruiter replies - the same person who would run the search",
    "Nothing is shared outside Talentrax Global",
    "Asking a question costs nothing and commits you to nothing",
  ],
  fieldsets: {
    contact: {
      legend: "About you",
      hint: "So we know who to come back to.",
    },
    role: {
      legend: "About the role",
      hint: "The more of this you can give us, the more useful the first reply is.",
    },
    compensation: {
      legend: "Salary or rate range",
      hint: "Optional, but it is the single most useful thing on this form. We will tell you if the band will not land the profile you have described.",
    },
  },
  location: {
    legend: "Location",
    hint: "Where the work is based, even if the role is remote-friendly.",
  },
  /** First option in every select: the deliberate "nothing chosen yet" state. */
  selectPlaceholder: "Choose one",
  required: {
    /** Sits above the form; explains the marker rather than relying on colour. */
    legend: "Fields marked with an asterisk are required.",
    /** The visible marker itself. Aria-hidden: the sr-only word carries it. */
    marker: "*",
  },
  errorSummary: {
    /** Heading of the role="alert" region shown after a failed submit. */
    title: "There is a problem with this form",
    intro: "Check the following and try again:",
  },
  submit: {
    label: "Send this requisition",
    busyLabel: "Sending...",
  },
  success: {
    title: "Requisition received",
    body: "Thanks - your brief is with us. A recruiter from the matching desk will come back to you at the email address you gave.",
    /** Honest about the current build state rather than inventing an SLA. */
    note: "This site has no backend yet, so nothing was transmitted. The payload was written to the browser console instead.",
    resetLabel: "Send another requisition",
    backLabel: "Back to Employers",
  },
  privacyNote:
    "We use these details to respond to your request and nothing else. No third-party analytics or tracking runs on this site.",
  /**
   * Anti-spam. The honeypot is a real input hidden from sighted users and
   * from assistive technology; a human never sees it, so anything in it came
   * from a bot filling every field. The delay catches scripted posts that
   * complete the form faster than a person could read it.
   */
  spam: {
    honeypotId: "company-website",
    honeypotLabel: "Company website",
    minSubmitSeconds: 3,
  },
};
