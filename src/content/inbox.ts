/**
 * The staff inbox: /staff/inbox and /staff/inbox/<kind>/<id>. Build step 8.
 *
 * Every word the inbox shows. What a staff member sees is decided by RLS,
 * not here: an administrator sees every submission; anyone else, only what
 * is routed to them (and a research analyst, every Request Talent lead).
 */

export const STAFF_INBOX_PATH = "/staff/inbox";

export type InboxKind = "contact" | "request" | "resume";

export const inboxKinds: { id: InboxKind; label: string; singular: string }[] = [
  { id: "contact", label: "Contact messages", singular: "Contact message" },
  { id: "request", label: "Talent requests", singular: "Talent request" },
  { id: "resume", label: "Resumes", singular: "Resume" },
];

export const inboxMeta = {
  list: { title: "Inbox", description: "What has arrived through the site's forms." },
  detail: { title: "Inbox: submission", description: "One submission from the site's forms." },
};

export const inboxList = {
  eyebrow: "Staff",
  heading: "Inbox",
  intro: "What has arrived through the site's three forms, newest first.",
  filterLegend: "Show",
  allLabel: "Everything",
  showTests: "Include test submissions",
  hideTests: "Hide test submissions",
  testsHidden: "Test submissions are hidden.",
  tableCaption: "Submissions, newest first",
  columns: {
    received: "Received",
    from: "From",
    form: "Form",
    about: "About",
    status: "Status",
    file: "Resume file",
    flags: "Flags",
  },
  open: (name: string) => `Open the submission from ${name}`,
  /** RLS returns nothing; whether that means "none" or "none for you" is not ours to know. */
  empty:
    "Nothing to show. Either nothing has arrived, or nothing has been routed to you: administrators see every submission, other staff only those assigned to them.",
  truncated: (n: number) => `Showing the newest ${n} of each form.`,
  backLabel: "Back to the staff area",
};

/** A resume's file, as the list and the detail page both say it. */
export const fileStates = {
  received: { label: "Received", detail: "Checked: the file is what its name says." },
  refused: {
    label: "Refused",
    detail: "The file failed the check on what it really is, and is being deleted. It cannot be opened.",
  },
  never_arrived: {
    label: "Never arrived",
    detail: "An upload was started and nothing arrived before the upload link expired.",
  },
  not_checked: {
    label: "Not checked yet",
    detail: "Uploaded, or still on its way. Opening the submission checks it.",
  },
  none: { label: "No file", detail: "The upload never started." },
} as const;

/** On the detail page, when opening the row just checked and found nothing there. */
export const nothingArrivedYet =
  "Checked just now: nothing has arrived at the upload link yet. If nothing arrives within about two hours of the upload starting, it is marked as never arrived.";

export type FileStateId = keyof typeof fileStates;

export const refusedReasons: Record<string, string> = {
  signature_mismatch: "not a PDF, DOC or DOCX file inside, whatever its name says",
  size_mismatch: "not the size the form said it would be",
  type_mismatch: "not the type the form said it would be",
};

export const flags = {
  held: "Held for review",
  heldWhy: {
    trap: "Caught twice by the form's spam trap.",
    limit: "More submissions than usual from this email address in a day.",
  },
  test: "Test",
};

export const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
  spam: "Spam",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  disqualified: "Disqualified",
  triaged: "Triaged",
  rejected: "Rejected",
};

/** The statuses staff may set from the inbox, per form. The rest is pipeline work. */
export const settableStatuses: Record<InboxKind, string[]> = {
  contact: ["new", "in_progress", "closed", "spam"],
  request: ["new", "contacted"],
  resume: ["new", "triaged", "rejected", "spam"],
};

export const inboxDetail = {
  eyebrow: "Inbox",
  backLabel: "Back to the inbox",
  received: "Received",
  fieldsHeading: "What they sent",
  fileHeading: "Resume file",
  download: (filename: string) => `Download ${filename}`,
  downloadNote: "Downloads as a file. It is never opened in the browser.",
  actionsHeading: "Work it",
  statusLegend: "Status",
  saveStatus: "Save status",
  markTest: "Mark as a test",
  markReal: "Mark as real",
  testExplained: "Test submissions are hidden from the inbox by default.",
  saved: "Saved.",
  notSaved: "That change was not saved. You may not have permission to change this submission.",
  notFound: "No such submission, or it is not routed to you.",
  yes: "Yes",
  no: "No",
  none: "Not given",
};

/** Field labels on the detail page, per form. */
export const detailLabels = {
  contact: {
    full_name: "Name",
    email: "Email",
    phone: "Phone",
    enquiry_type: "Employer or job seeker",
    subject: "Subject",
    message: "Message",
  },
  request: {
    contact_name: "Name",
    contact_email: "Work email",
    contact_phone: "Phone",
    contact_title: "Their job title",
    company_name: "Company",
    role_title: "Role",
    requested_service: "Engagement model",
    desk: "Desk",
    specialty: "Specialty",
    city: "City",
    state: "State",
    work_mode: "Work mode",
    positions: "Positions",
    target_start: "Target start",
    salary: "Salary or rate range",
    submitted_details: "Anything else",
  },
  resume: {
    full_name: "Name",
    email: "Email",
    phone: "Phone",
    city: "City",
    state: "State",
    desk: "Desk",
    specialty: "Specialty",
    work_authorized: "Authorized to work in the US without sponsorship",
    engagement_types: "Engagement types",
    linkedin_url: "LinkedIn",
    message: "Message",
    consent_future_roles: "Consented to hear about other roles",
  },
};
