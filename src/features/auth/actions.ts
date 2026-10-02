"use server";

/**
 * Staff sign-in's server actions. Each one asks the data access layer
 * itself; none trusts the page it was posted from.
 *
 * Redirects are thrown outside any try: next/navigation's redirect() works
 * by throwing.
 *
 * NOTHING IS LOGGED. See queries.server.ts.
 */

import { redirect } from "next/navigation";

import {
  STAFF_HOME_PATH,
  STAFF_SET_UP_PATH,
  STAFF_SIGN_IN_PATH,
  STAFF_VERIFY_PATH,
} from "@/content/staff";

import {
  confirmStaffEnrolment,
  signInStaffWithPassword,
  signOutStaff,
  startStaffEnrolment,
  verifyStaffCode,
  type Enrolment,
} from "./queries.server";

/** A failed step: `failures` counts them, so the form re-announces a repeat. */
export type StepState = { failures: number };

/**
 * Every password attempt takes at least this long, whatever happened: a
 * refused address, no account, a wrong password and a non-staff account all
 * answer after the same pause (CLAUDE.md, account security rule 1).
 */
const PASSWORD_STEP_MIN_MS = 1500;

async function lastAtLeast(startedAt: number, ms: number) {
  const left = ms - (Date.now() - startedAt);
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
}

const SIX_DIGITS = /^\d{6}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function staffSignInAction(previous: StepState, formData: FormData): Promise<StepState> {
  const startedAt = Date.now();
  const email = text(formData, "staff-email").trim();
  const password = text(formData, "staff-password");
  const next = email && password ? await signInStaffWithPassword(email, password) : "failed";
  await lastAtLeast(startedAt, PASSWORD_STEP_MIN_MS);
  if (next === "verify") redirect(STAFF_VERIFY_PATH);
  if (next === "set_up") redirect(STAFF_SET_UP_PATH);
  return { failures: previous.failures + 1 };
}

export async function staffVerifyAction(previous: StepState, formData: FormData): Promise<StepState> {
  const code = text(formData, "staff-code").trim();
  const ok = SIX_DIGITS.test(code) && (await verifyStaffCode(code));
  if (ok) redirect(STAFF_HOME_PATH);
  return { failures: previous.failures + 1 };
}

/** Starting setup returns what the app needs; nothing is kept here. */
export type EnrolmentState = { enrolment: Enrolment | null; startFailed: boolean };

export async function staffStartEnrolmentAction(): Promise<EnrolmentState> {
  const enrolment = await startStaffEnrolment();
  return { enrolment, startFailed: enrolment === null };
}

/**
 * The factor id arrives from the page, so it is not trusted: setup is only
 * confirmed for a signed-in staff account with no verified factor, and Auth
 * refuses a factor that is not that account's.
 */
export async function staffConfirmEnrolmentAction(previous: StepState, formData: FormData): Promise<StepState> {
  const code = text(formData, "staff-code").trim();
  const factorId = text(formData, "factor-id");
  const ok = factorId !== "" && SIX_DIGITS.test(code) && (await confirmStaffEnrolment(factorId, code));
  if (ok) redirect(STAFF_HOME_PATH);
  return { failures: previous.failures + 1 };
}

export async function staffSignOutAction(): Promise<void> {
  await signOutStaff();
  redirect(STAFF_SIGN_IN_PATH);
}
