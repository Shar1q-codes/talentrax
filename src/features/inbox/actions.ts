"use server";

/**
 * The inbox's two changes: a submission's status, and whether it is a test.
 * Plain form posts from the detail page, so they work before any JavaScript
 * has loaded; each redirects back with whether RLS let the change through.
 *
 * The database decides who may change what (RLS, migration 5). These check
 * only the shape of what was sent, and queries.server.ts checks the session.
 */

import { redirect } from "next/navigation";

import { STAFF_INBOX_PATH, type InboxKind } from "@/content/inbox";

import { setStatus, setTest } from "./queries.server";

const KINDS: readonly InboxKind[] = ["contact", "request", "resume"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function target(formData: FormData): { kind: InboxKind; id: string } | null {
  const kind = formData.get("kind");
  const id = formData.get("id");
  if (typeof kind !== "string" || !(KINDS as readonly string[]).includes(kind)) return null;
  if (typeof id !== "string" || !UUID.test(id)) return null;
  return { kind: kind as InboxKind, id };
}

function back(where: { kind: InboxKind; id: string } | null, ok: boolean): never {
  if (!where) redirect(STAFF_INBOX_PATH);
  redirect(`${STAFF_INBOX_PATH}/${where.kind}/${where.id}?${ok ? "saved" : "notsaved"}=1`);
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const where = target(formData);
  const status = formData.get("status");
  const ok = where !== null && typeof status === "string" && (await setStatus(where.kind, where.id, status));
  back(where, ok);
}

export async function setTestAction(formData: FormData): Promise<void> {
  const where = target(formData);
  const ok = where !== null && (await setTest(where.kind, where.id, formData.get("isTest") === "true"));
  back(where, ok);
}
