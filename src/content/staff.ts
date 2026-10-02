/**
 * Staff sign-in copy: /staff/sign-in, its second-factor steps, and /staff.
 *
 * Unlinked from every public page, noindex, absent from the sitemap. Staff
 * reach it by its address.
 *
 * Every failure message is generic, for the same reasons as the account
 * screens (CLAUDE.md, "Security rules"): a wrong password, an address with
 * no account, an account that is not staff, and an address with another
 * attempt already in progress all read the same, and take the same minimum
 * time.
 */

import type { FieldConfig } from "./request-talent";
import { site } from "./site";

export const STAFF_HOME_PATH = "/staff";
export const STAFF_SIGN_IN_PATH = "/staff/sign-in";
export const STAFF_VERIFY_PATH = "/staff/sign-in/verify";
export const STAFF_SET_UP_PATH = "/staff/sign-in/set-up";

export const staffMeta = {
  signIn: { title: "Staff sign-in", description: `Sign-in for ${site.name} staff.` },
  verify: { title: "Staff sign-in: code", description: `Sign-in for ${site.name} staff.` },
  setUp: { title: "Staff sign-in: set up", description: `Sign-in for ${site.name} staff.` },
  home: { title: "Staff", description: `The ${site.name} staff area.` },
};

export const staffForm = {
  requiredLegend: "Fields marked with an asterisk are required.",
  errorSummary: {
    title: "There is a problem",
    intro: "Check the following and try again:",
  },
};

/** Shown when this build has no database: nobody can sign in to anything. */
export const staffUnavailable =
  "Staff sign-in is not available on this copy of the site.";

export const staffSignIn = {
  eyebrow: "Staff",
  heading: "Sign in",
  intro: `For ${site.name} staff. You will need your password and the authenticator app on your phone.`,
  fieldsetLegend: "Your details",
  fields: {
    email: {
      id: "staff-email",
      label: "Email",
      autoComplete: "email",
      required: true,
      errorRequired: "Enter your email address.",
      errorFormat: "Enter an email address in the format name@example.com.",
    },
    password: {
      id: "staff-password",
      label: "Password",
      autoComplete: "current-password",
      required: true,
      errorRequired: "Enter your password.",
    },
  } satisfies Record<string, FieldConfig>,
  submit: { label: "Continue", busyLabel: "Checking..." },
  /** Never says which half was wrong, whether the account exists, or why. */
  failed: "We could not sign you in with those details. Check them and try again, or wait a few minutes.",
  /** No reset in the app: supabase/STAFF-ACCESS.md. */
  help: "Forgotten your password, or lost your phone? Ask an administrator. There is no reset here, on purpose.",
};

const codeField = {
  id: "staff-code",
  label: "Code",
  hint: "The six digits your authenticator app shows for this site.",
  autoComplete: "one-time-code",
  required: true,
  errorRequired: "Enter the six-digit code.",
  errorFormat: "Enter the six digits, with no spaces.",
} satisfies FieldConfig;

export const staffVerify = {
  eyebrow: "Staff",
  heading: "Enter your code",
  intro: "Open your authenticator app and enter the code it shows for this site.",
  fieldsetLegend: "Second step",
  field: codeField,
  submit: { label: "Sign in", busyLabel: "Checking..." },
  failed: "That code did not sign you in. Codes change every 30 seconds: enter the one showing now, or wait a few minutes.",
  startOver: "Use a different account",
};

export const staffSetUp = {
  eyebrow: "Staff",
  heading: "Set up your authenticator",
  intro: `Staff sign-in needs a second step: a code from an authenticator app on your phone. This is a one-time setup.`,
  start: {
    body: "You need an authenticator app, such as the one your phone came with or any app that supports time-based codes.",
    label: "Start setup",
    busyLabel: "Preparing...",
  },
  scan: {
    heading: "1. Add this site to your app",
    body: "Scan the code with your authenticator app.",
    qrLabel: "QR code to add this site to an authenticator app",
    secretIntro: "If you cannot scan it, enter this key in the app instead:",
  },
  confirm: {
    heading: "2. Enter the code it shows",
    fieldsetLegend: "Confirm the app works",
  },
  field: codeField,
  submit: { label: "Finish setup", busyLabel: "Checking..." },
  failed: "That code did not work. Enter the code showing now, or wait a few minutes.",
  startFailed: "Setup could not start. Try again in a moment.",
  startOver: "Use a different account",
};

export const staffHome = {
  eyebrow: "Staff",
  heading: "Signed in",
  signedInAs: (name: string) => `You are signed in as ${name}.`,
  /** Build step 8 is the inbox. Say so, rather than show an empty shell. */
  nothingYet: "There is nothing here yet. The inbox for what arrives through the site's forms comes next.",
  signOut: "Sign out",
};
