/**
 * The submit seams for the three account screens.
 *
 * THERE IS NO AUTHENTICATION. Nothing here signs anyone in, creates an
 * account, or sends an email. Each function returns `unavailable`, and the
 * pages say so plainly rather than faking a success.
 *
 * ── NOTHING IS LOGGED HERE ────────────────────────────────────────────────
 * The other three seams in this repo (request-talent, job-seekers, contact)
 * console.log their payload, because a requisition is business data and there
 * is no backend to send it to yet. These MUST NOT, and the difference is not
 * stylistic:
 *
 *   - A password in a console log is a password in a log. Browser consoles
 *     are captured by extensions, screen-sharing, session recorders and
 *     support tooling, and people reuse passwords across sites.
 *   - "The whole payload minus the password" is not safe either: a login
 *     attempt is a claim that an email has an account here, and an email
 *     address paired with an authentication attempt is more sensitive than
 *     either alone.
 *   - Anything derived from a password - a length, a hash, a strength score
 *     - is still information about the password.
 *
 * So there is no logging in this file at all, not even of the email. If you
 * are debugging, use a breakpoint; do not add a log and delete it later.
 *
 * ── NO CLIENT-SIDE SESSION STATE ──────────────────────────────────────────
 * Nothing here or in the account pages may write localStorage,
 * sessionStorage, document.cookie, or an "isLoggedIn" flag of any kind. A
 * session is the backend's to issue, in an HttpOnly cookie it sets itself. A
 * client-side flag is not a placeholder for that - it is a thing an attacker
 * sets in a console, and it invites UI that trusts it.
 *
 * ── NEVER DISCLOSE WHETHER AN EMAIL EXISTS ────────────────────────────────
 * Not on sign-in, not on registration, not on password reset. Every outcome
 * these functions can produce is deliberately indistinguishable between "that
 * account exists" and "it does not", and the copy in content/auth.ts is
 * written the same way. An endpoint that answers that question hands an
 * attacker a list of valid accounts, and a registration form that says "that
 * email is already taken" answers it just as loudly as a login form does.
 * Keep it that way when the backend lands.
 */

export type SignInInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  consent: {
    /** Required. Account creation and contact about roles asked for. */
    accountAndContact: boolean;
    /** Optional and separate. Contact about future roles. */
    futureRoles: boolean;
  };
};

export type PasswordResetInput = {
  email: string;
};

/**
 * What a page may render.
 *
 * Status only, no message: the words live in content/auth.ts like every other
 * string on this site, and keeping them out of here makes it harder to
 * accidentally write a status-specific message that leaks whether an account
 * exists.
 *
 *   accepted    - the request was taken. Says NOTHING about whether an
 *                 account exists; the copy for it must not either.
 *   unavailable - there is no backend. The honest answer today.
 *   failed      - something went wrong. Generic, and never diagnostic.
 */
export type AuthStatus = "accepted" | "unavailable" | "failed";

export type AuthOutcome = { status: AuthStatus };

const NOT_WIRED: AuthOutcome = { status: "unavailable" };

/**
 * TODO(api): POST the credentials and let the server set an HttpOnly,
 * Secure, SameSite session cookie. Return `accepted` on 200 and `failed` on
 * anything else, WITHOUT distinguishing a wrong password from an unknown
 * email - the server must not distinguish them either, and must take the same
 * time over both.
 *
 *   const response = await fetch("/api/auth/sign-in", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(input),
 *     credentials: "same-origin",
 *   });
 *   return { status: response.ok ? "accepted" : "failed" };
 *
 * Do not return a token to JavaScript. Do not store anything client-side.
 * Rate limiting and lockout are server-side concerns and cannot be done here.
 */
export async function signIn(input: SignInInput): Promise<AuthOutcome> {
  void input; // Deliberately unused, and deliberately not logged.
  return NOT_WIRED;
}

/**
 * TODO(api): POST the registration. The response must be identical whether or
 * not the email already has an account - no "that email is taken". If it is
 * taken, the server sends a "someone tried to register with your address"
 * email to the existing account instead, and the page shows the same generic
 * confirmation either way.
 *
 * Candidate accounts only. Employer accounts are created by the Talentrax
 * team, so this endpoint must not accept an account-type parameter; if one
 * ever appears in the payload, that is a privilege-escalation hole.
 */
export async function registerAccount(
  input: RegisterInput,
): Promise<AuthOutcome> {
  void input;
  return NOT_WIRED;
}

/**
 * TODO(api): POST the email and always return the same thing. The endpoint
 * must answer identically for a known and an unknown address, and must not
 * be slower for one than the other - a timing difference discloses exactly
 * what the generic message is there to hide.
 */
export async function requestPasswordReset(
  input: PasswordResetInput,
): Promise<AuthOutcome> {
  void input;
  return NOT_WIRED;
}
