import "server-only";

/**
 * The inbox's every database call, through the signed-in staff member's own
 * session (src/lib/supabase/server.ts). RLS decides what each person sees and
 * may change: an administrator, everything; anyone else, what is routed to
 * them (a research analyst, every website lead). Nothing here widens that.
 *
 * Every function asks getStaffAccess() first and returns nothing for anyone
 * short of a staff session at aal2. The database holds the same line on its
 * own (migration 14).
 *
 * The one call made with more than the session: opening a resume whose file
 * was never checked runs the check (features/job-seekers), which needs the
 * secret key to read the bytes. It records a verdict and nothing else.
 *
 * A resume file is downloaded only through a short-lived signed URL made
 * with the session, so the storage policy applies: received files only
 * (migration 18), and only to whoever may read the row.
 *
 * NOTHING IS LOGGED.
 */

import { getStaffAccess } from "@/features/auth/server";
import { checkResumeUpload } from "@/features/job-seekers/server";
import { settableStatuses, type FileStateId, type InboxKind } from "@/content/inbox";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { fileStateOf } from "./file-state";

const TABLE = { contact: "contact_messages", request: "leads", resume: "resume_submissions" } as const;
const PER_FORM = 100;

type Common = {
  id: string;
  created_at: string;
  status: string;
  held_at: string | null;
  trap_tripped: boolean;
  is_test: boolean;
};

export type InboxItem = {
  kind: InboxKind;
  id: string;
  receivedAt: string;
  name: string;
  email: string;
  summary: { primary: string; secondary: string | null };
  status: string;
  held: "trap" | "limit" | null;
  isTest: boolean;
  /** Resumes only. */
  file: FileStateId | null;
};

const held = (row: Common): InboxItem["held"] => (row.held_at ? (row.trap_tripped ? "trap" : "limit") : null);

async function signedIn(): Promise<boolean> {
  return (await getStaffAccess()).state === "signed_in";
}

export async function listInbox(options: { kind: InboxKind | null; includeTests: boolean }): Promise<{
  items: InboxItem[];
  truncated: boolean;
}> {
  if (!(await signedIn())) return { items: [], truncated: false };
  const supabase = await createServerSupabaseClient();
  const want = (kind: InboxKind) => options.kind === null || options.kind === kind;
  const items: InboxItem[] = [];
  let truncated = false;

  if (want("contact")) {
    let query = supabase
      .from("contact_messages")
      .select("id, created_at, status, held_at, trap_tripped, is_test, full_name, email, subject, enquiry_type")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(PER_FORM);
    if (!options.includeTests) query = query.eq("is_test", false);
    const { data } = await query;
    truncated ||= (data?.length ?? 0) === PER_FORM;
    for (const row of data ?? []) {
      items.push({
        kind: "contact", id: row.id, receivedAt: row.created_at, name: row.full_name, email: row.email,
        summary: { primary: row.subject, secondary: row.enquiry_type === "employer" ? "Employer" : "Job seeker" },
        status: row.status, held: held(row), isTest: row.is_test, file: null,
      });
    }
  }

  if (want("request")) {
    let query = supabase
      .from("leads")
      .select("id, created_at, status, held_at, trap_tripped, is_test, contact_name, contact_email, role_title, company_name")
      .eq("source", "website_form")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(PER_FORM);
    if (!options.includeTests) query = query.eq("is_test", false);
    const { data } = await query;
    truncated ||= (data?.length ?? 0) === PER_FORM;
    for (const row of data ?? []) {
      items.push({
        kind: "request", id: row.id, receivedAt: row.created_at,
        name: row.contact_name ?? "", email: row.contact_email ?? "",
        summary: { primary: row.role_title ?? "", secondary: row.company_name },
        status: row.status, held: held(row), isTest: row.is_test, file: null,
      });
    }
  }

  if (want("resume")) {
    let query = supabase
      .from("resume_submissions")
      .select(
        "id, created_at, status, held_at, trap_tripped, is_test, full_name, email, desk, specialty, " +
          "resume_storage_path, resume_received_at, resume_rejected_at, resume_rejected_reason",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(PER_FORM);
    if (!options.includeTests) query = query.eq("is_test", false);
    const { data } = await query.returns<(Common & {
      full_name: string; email: string; desk: string | null; specialty: string | null;
      resume_storage_path: string | null; resume_received_at: string | null;
      resume_rejected_at: string | null; resume_rejected_reason: string | null;
    })[]>();
    truncated ||= (data?.length ?? 0) === PER_FORM;
    for (const row of data ?? []) {
      items.push({
        kind: "resume", id: row.id, receivedAt: row.created_at, name: row.full_name, email: row.email,
        summary: { primary: row.specialty ?? "", secondary: row.desk },
        status: row.status, held: held(row), isTest: row.is_test, file: fileStateOf(row),
      });
    }
  }

  items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0));
  return { items, truncated };
}

export type Submission = {
  kind: InboxKind;
  id: string;
  receivedAt: string;
  status: string;
  held: InboxItem["held"];
  isTest: boolean;
  /** Every submitted field, by column name. */
  fields: Record<string, unknown>;
  /** Resumes only: the file's state, its name, and why it was refused if it was. */
  file: { state: FileStateId; filename: string | null; reason: string | null; checkedMissing: boolean } | null;
};

/**
 * One submission, or null if it does not exist or RLS hides it - the same
 * answer either way. A resume whose file was never checked is checked
 * first, so the page never shows "not checked" for a file that is there.
 */
export async function getSubmission(kind: InboxKind, id: string): Promise<Submission | null> {
  if (!(await signedIn())) return null;
  const supabase = await createServerSupabaseClient();
  const read = async () => {
    const { data } = await supabase.from(TABLE[kind]).select("*").eq("id", id).is("deleted_at", null).maybeSingle();
    return data as (Common & Record<string, unknown>) | null;
  };

  let row = await read();
  if (!row) return null;

  let checkedMissing = false;
  if (kind === "resume") {
    const files = row as unknown as Parameters<typeof fileStateOf>[0] & { submission_key: string | null };
    if (fileStateOf(files) === "not_checked" && files.submission_key) {
      checkedMissing = (await checkResumeUpload(files.submission_key)).outcome === "missing";
      row = (await read()) ?? row;
    }
  }

  const { id: _id, created_at, status, held_at, trap_tripped, is_test, ...rest } = row;
  void _id;
  const resume = row as unknown as Parameters<typeof fileStateOf>[0] & { resume_filename: string | null };
  return {
    kind,
    id,
    receivedAt: created_at,
    status,
    held: held({ held_at, trap_tripped } as Common),
    isTest: is_test,
    fields: rest,
    file:
      kind === "resume"
        ? {
            state: fileStateOf(resume),
            filename: resume.resume_filename,
            reason: resume.resume_rejected_reason,
            checkedMissing: checkedMissing && fileStateOf(resume) === "not_checked",
          }
        : null,
  };
}

/** True only if RLS let the change through. */
export async function setStatus(kind: InboxKind, id: string, status: string): Promise<boolean> {
  if (!settableStatuses[kind].includes(status) || !(await signedIn())) return false;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from(TABLE[kind]).update({ status }).eq("id", id).select("id");
  return !error && (data?.length ?? 0) === 1;
}

/** True only if RLS let the change through. */
export async function setTest(kind: InboxKind, id: string, isTest: boolean): Promise<boolean> {
  if (!(await signedIn())) return false;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from(TABLE[kind]).update({ is_test: isTest }).eq("id", id).select("id");
  return !error && (data?.length ?? 0) === 1;
}

/**
 * A one-minute link that downloads a received resume as an attachment, made
 * with the staff member's own session. Null for anything else: a refused,
 * unchecked or missing file, a row hidden by RLS, or the storage policy
 * saying no (migration 18 refuses every file not received).
 */
export async function resumeDownloadUrl(id: string): Promise<string | null> {
  if (!(await signedIn())) return null;
  const supabase = await createServerSupabaseClient();
  const { data: row } = await supabase
    .from("resume_submissions")
    .select("resume_storage_path, resume_received_at, resume_rejected_at, resume_rejected_reason, resume_filename")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row || fileStateOf(row) !== "received" || !row.resume_storage_path) return null;

  const { data } = await supabase.storage
    .from("resume-intake")
    .createSignedUrl(row.resume_storage_path, 60, { download: row.resume_filename ?? true });
  return data?.signedUrl ?? null;
}
