/**
 * Copy and field configuration for /login, /register and /forgot-password.
 *
 * ── EVERY OUTCOME MESSAGE IS DELIBERATELY VAGUE ───────────────────────────
 * None of the messages below reveal whether an email address has an account.
 * Not the sign-in failure, not the registration confirmation, not the
 * password reset one. They are written this way on purpose and rewriting any
 * of them to be "clearer" reopens the hole:
 *
 *   "No account with that email"        tells an attacker which emails are
 *   "That email is already registered"  valid. Enumerating a candidate
 *   "Check your inbox for the reset"    database one address at a time is
 *                                       exactly how that is done.
 *
 * The reset message says "if that email has an account" and always says it.
 * The registration confirmation says the same thing about whether an account
 * was created. Keep them ambiguous.
 *
 * ── CANDIDATE ACCOUNTS ONLY ───────────────────────────────────────────────
 * Employer accounts are created by the Talentrax team, not self-service.
 * /register is a candidate account and says so; there is deliberately no
 * account-type selector to choose otherwise.
 *
 * ── PASSWORD MINIMUM ──────────────────────────────────────────────────────
 * Stated in visible text beside the field and enforced in validation, but
 * client-side length checking is a courtesy to the person typing, NOT a
 * security control. The backend has to enforce its own minimum and it has
 * not chosen one - CLIENT-CONFIRM.md item 15. There is no strength meter:
 * scoring a password against rules nobody has set is theatre.
 */

import type { FieldConfig } from "./request-talent";

export const LOGIN_PATH = "/login";
export const REGISTER_PATH = "/register";
export const FORGOT_PASSWORD_PATH = "/forgot-password";

/**
 * Minimum password length, stated on the page and checked in validation.
 * A floor for typing mistakes, not a security boundary.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Shown above the form on each screen, in the page's own voice.
 *
 * These exist because the account links are in the navigation while the
 * backend is not built. A visible Sign in link that leads to a form which
 * cannot sign anyone in needs the page to say so before someone types a
 * password into it - not as a banner, as a sentence.
 *
 * ALL THREE ARE REMOVED in the same commit that wires the backend. They are
 * the only thing making a visible, unwired sign-in honest, so they go when it
 * stops being unwired, and not a commit earlier.
 */
export const notOpenYet = {
  login:
    "Accounts are not open yet, so this form cannot sign anyone in. You do not need one to send us your resume.",
  register:
    "Accounts are not open yet, so this form cannot create one. The resume form works today and needs no account.",
  forgotPassword:
    "Accounts are not open yet, so there is nothing to reset and no email will be sent.",
};

/** Shown after a submit: what actually happened, which is nothing. */
export const notWiredNotice =
  "Accounts are not live yet. This form is built but not connected to anything, so nothing was submitted and no email was sent.";

/* ------------------------------------------------------------- Sign in */

export const loginMeta = {
  title: "Sign In",
  description:
    "Sign in to your Talentrax Global candidate account. Accounts are not live yet.",
};

export const login = {
  eyebrow: "Account",
  heading: "Sign in",
  intro:
    "For candidates with a Talentrax Global account. You do not need one to send us your resume.",
  fieldsetLegend: "Your details",
  fields: {
    email: {
      id: "login-email",
      label: "Email",
      autoComplete: "email",
      required: true,
      errorRequired: "Enter your email address.",
      errorFormat: "Enter an email address in the format name@example.com.",
    },
    password: {
      id: "login-password",
      label: "Password",
      autoComplete: "current-password",
      required: true,
      errorRequired: "Enter your password.",
    },
  } satisfies Record<string, FieldConfig>,
  submit: { label: "Sign in", busyLabel: "Signing in..." },
  /**
   * A fallback. Once auth is wired an accepted sign-in redirects instead of
   * rendering anything, so this should only ever appear if that redirect
   * fails. It states nothing about the account either way.
   */
  acceptedMessage: "Signed in.",
  /**
   * Says nothing about which half was wrong, or whether the account exists.
   * This is the correct message for a real backend too.
   */
  failedMessage:
    "We could not sign you in with those details. Check them and try again.",
  forgotLabel: "Forgotten your password?",
  forgotHref: FORGOT_PASSWORD_PATH,
  registerIntro: "No account?",
  registerLabel: "Create one",
  registerHref: REGISTER_PATH,
  /** No account needed for the thing most people came to do. */
  uploadIntro: "You can send us your resume without an account at all.",
  uploadLabel: "Upload your resume",
  uploadHref: "/job-seekers/upload-resume",
};

/* ------------------------------------------------------------ Register */

export const registerMeta = {
  title: "Create an Account",
  description:
    "Create a Talentrax Global candidate account. Employer accounts are set up by the Talentrax Global team. Accounts are not live yet.",
};

export const register = {
  eyebrow: "Account",
  heading: "Create a candidate account",
  intro:
    "An account keeps your details current with the desk that recruits your discipline. You do not need one to apply - the resume form works without one.",
  /** No account-type selector: employer accounts are not self-service. */
  employerNotice:
    "Hiring? Employer accounts are set up by our team. Send us a requisition or get in touch and we will arrange it.",
  employerLinkLabel: "Request talent",
  employerLinkHref: "/employers/request-talent",
  fieldsetLegend: "Your details",
  consentLegend: "Consent",
  consentHint:
    "The first is required to create an account. The second is yours to choose.",
  fields: {
    fullName: {
      id: "register-name",
      label: "Full name",
      autoComplete: "name",
      required: true,
      errorRequired: "Enter your full name.",
    },
    email: {
      id: "register-email",
      label: "Email",
      hint: "This is what you will sign in with.",
      autoComplete: "email",
      required: true,
      errorRequired: "Enter your email address.",
      errorFormat: "Enter an email address in the format name@example.com.",
    },
    password: {
      id: "register-password",
      label: "Password",
      hint: `At least ${MIN_PASSWORD_LENGTH} characters. Longer is better than complicated - a phrase you can remember beats a short password with symbols in it.`,
      autoComplete: "new-password",
      required: true,
      errorRequired: "Choose a password.",
      errorFormat: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    },
    confirmPassword: {
      id: "register-password-confirm",
      label: "Confirm password",
      autoComplete: "new-password",
      required: true,
      errorRequired: "Type your password again.",
      errorFormat: "Both passwords must match.",
    },
  } satisfies Record<string, FieldConfig>,
  consentFields: {
    accountAndContact: {
      id: "register-consent-account",
      label:
        "I agree to Talentrax Global creating an account for me, storing the details I give it, and contacting me about roles I have asked to hear about.",
      required: true,
      errorRequired:
        "We cannot create an account without your consent to store your details and contact you.",
    },
    futureRoles: {
      id: "register-consent-future",
      label:
        "You can also contact me about future roles beyond the ones I have asked about.",
      hint: "Optional. Leaving it unchecked changes nothing else about your account.",
      required: false,
    },
  } satisfies Record<string, FieldConfig>,
  submit: { label: "Create account", busyLabel: "Creating account..." },
  /**
   * Identical whether or not the address already has an account. If it does,
   * the backend emails that account instead of telling this page. Do not add
   * "that email is already registered" - it answers the enumeration question
   * just as loudly as a login error would.
   */
  acceptedMessage:
    "Thanks. If that email can be registered, we have sent it a link to finish setting up the account. If it already has one, we have sent a sign-in reminder instead.",
  failedMessage: "We could not complete that just now. Try again shortly.",
  signInIntro: "Already have an account?",
  signInLabel: "Sign in",
  signInHref: LOGIN_PATH,
  privacyIntro: "What we do with your details is in our",
  privacyLabel: "privacy policy",
  privacyHref: "/privacy-policy",
};

/* ----------------------------------------------------- Forgot password */

export const forgotPasswordMeta = {
  title: "Reset Your Password",
  description:
    "Request a password reset link for your Talentrax Global candidate account. Accounts are not live yet.",
};

export const forgotPassword = {
  eyebrow: "Account",
  heading: "Reset your password",
  intro:
    "Give us the email address on the account and we will send a reset link to it.",
  fieldsetLegend: "Your email",
  fields: {
    email: {
      id: "reset-email",
      label: "Email",
      autoComplete: "email",
      required: true,
      errorRequired: "Enter your email address.",
      errorFormat: "Enter an email address in the format name@example.com.",
    },
  } satisfies Record<string, FieldConfig>,
  submit: { label: "Send a reset link", busyLabel: "Sending..." },
  /**
   * THE message. Always the same, whether or not the address has an account.
   * Never change it to confirm that an email was found.
   */
  acceptedMessage:
    "If that email has an account, we have sent it a reset link. Check the inbox, and the spam folder.",
  failedMessage: "We could not do that just now. Try again shortly.",
  backIntro: "Remembered it?",
  backLabel: "Back to sign in",
  backHref: LOGIN_PATH,
};

/* ------------------------------------------------------ Shared form copy */

export const authForm = {
  requiredLegend: "Fields marked with an asterisk are required.",
  errorSummary: {
    title: "There is a problem with this form",
    intro: "Check the following and try again:",
  },
  /** Heading of the panel shown after any submit. */
  outcomeTitle: "Thanks",
};
