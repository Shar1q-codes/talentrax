import "server-only";

/**
 * Staff sign-in: every Supabase call staff authentication makes.
 *
 * Server-only, through the session client (src/lib/supabase/server.ts): the
 * session is an HttpOnly cookie, scoped to /staff, that only the server sets.
 * Nothing in the browser holds or reads it.
 *
 * NOTHING HERE IS LOGGED, for the reasons in queries.ts: not the password,
 * not the code, not the address, not an outcome paired with any of them.
 *
 * THE DATA ACCESS LAYER. getStaffAccess() is the one answer to "who is
 * this, and how far have they got", and every staff page and every staff
 * action asks it itself. A layout is not a guard: it does not re-run on
 * every navigation, and it does not stop a page or an action from running
 * (node_modules/next/dist/docs/01-app/02-guides/authentication.md).
 *
 * The database enforces the same thing on its own: a staff role counts only
 * at aal2 (migration 14), so a session that has passed only the password
 * reads nothing beyond its own profile row, whatever calls it.
 */

import { cache } from "react";
import { NextResponse, type NextRequest } from "next/server";

import { site } from "@/content/site";
import { STAFF_HOME_PATH, STAFF_SET_UP_PATH, STAFF_SIGN_IN_PATH, STAFF_VERIFY_PATH } from "@/content/staff";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createProxySupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

import { qrFromSvg, type QrModules } from "./totp-qr";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** The two roles that are not staff, and never sign in here. */
const NOT_STAFF = new Set(["employer_user", "job_seeker"]);

export type StaffAccess =
  /** This build has no database: nobody can sign in. */
  | { state: "unavailable" }
  | { state: "signed_out" }
  /** Signed in, but not as staff: an employer or candidate account. */
  | { state: "not_staff" }
  /** Password passed; no authenticator set up yet. */
  | { state: "needs_enrolment"; email: string }
  /** Password passed; the code is still to come. */
  | { state: "needs_verification"; email: string; factorId: string }
  | { state: "signed_in"; email: string; displayName: string };

async function accessFor(supabase: Client): Promise<StaffAccess> {
  // getUser() asks Auth, rather than trusting the cookie's contents.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return { state: "signed_out" };

  // The caller's own profile row is readable at aal1 (profiles_select_self).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || NOT_STAFF.has(profile.role)) return { state: "not_staff" };

  const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel === "aal2") {
    return { state: "signed_in", email: user.email, displayName: profile.full_name || user.email };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp.find((factor) => factor.status === "verified");
  return verified
    ? { state: "needs_verification", email: user.email, factorId: verified.id }
    : { state: "needs_enrolment", email: user.email };
}

/** Who is asking, and how far they have got. Once per request. */
export const getStaffAccess = cache(async (): Promise<StaffAccess> => {
  if (!isSupabaseConfigured()) return { state: "unavailable" };
  return accessFor(await createServerSupabaseClient());
});

/**
 * Where each state belongs. A staff page that is not this path for the
 * caller's state redirects to it, so nobody reaches a step out of order.
 */
export function staffPathFor(access: StaffAccess): string {
  switch (access.state) {
    case "signed_in":
      return STAFF_HOME_PATH;
    case "needs_verification":
      return STAFF_VERIFY_PATH;
    case "needs_enrolment":
      return STAFF_SET_UP_PATH;
    default:
      return STAFF_SIGN_IN_PATH;
  }
}

/** Counts one attempt for the address; false means refuse it (migration 14). */
async function attemptAllowed(supabase: Client, email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("sign_in_attempt", { email });
  return !error && data === true;
}

export type PasswordStep = "verify" | "set_up" | "failed";

/**
 * The password half. Anything but a staff account that knows its password
 * comes back "failed", whatever the reason, and a non-staff account that did
 * sign in is signed straight out again.
 */
export async function signInStaffWithPassword(email: string, password: string): Promise<PasswordStep> {
  if (!isSupabaseConfigured()) return "failed";
  const supabase = await createServerSupabaseClient();
  if (!(await attemptAllowed(supabase, email))) return "failed";

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "failed";

  const access = await accessFor(supabase);
  if (access.state === "needs_verification") return "verify";
  if (access.state === "needs_enrolment") return "set_up";
  await supabase.auth.signOut({ scope: "local" });
  return "failed";
}

/** The second half: a code from the enrolled authenticator. */
export async function verifyStaffCode(code: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createServerSupabaseClient();
  const access = await accessFor(supabase);
  if (access.state !== "needs_verification") return false;
  if (!(await attemptAllowed(supabase, access.email))) return false;

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: access.factorId, code });
  if (error) return false;
  await supabase.rpc("sign_in_succeeded");
  return true;
}

export type Enrolment = { factorId: string; secret: string; qr: QrModules | null };

/**
 * First sign-in: a new authenticator. Any half-finished setup from before is
 * removed first, so there is never more than one unverified factor, and
 * never a second verified one (enrolment is only offered with none).
 */
export async function startStaffEnrolment(): Promise<Enrolment | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const access = await accessFor(supabase);
  if (access.state !== "needs_enrolment") return null;

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: site.name,
    friendlyName: `${site.name} staff`,
  });
  if (error || !data) return null;
  return { factorId: data.id, secret: data.totp.secret, qr: qrFromSvg(data.totp.qr_code) };
}

/** Finishing setup: the first code from the new authenticator. */
export async function confirmStaffEnrolment(factorId: string, code: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createServerSupabaseClient();
  const access = await accessFor(supabase);
  if (access.state !== "needs_enrolment") return false;
  if (!(await attemptAllowed(supabase, access.email))) return false;

  // Auth refuses a factor that is not this user's.
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return false;
  await supabase.rpc("sign_in_succeeded");
  return true;
}

/** Ends this device's session. Other devices keep theirs. */
export async function signOutStaff(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "local" });
}

/**
 * For the proxy, on staff routes only: refreshes an expiring session and
 * writes the new cookies before the page renders, which a server component
 * cannot. Not an access check - pages and actions make that themselves.
 */
export async function refreshStaffSession(request: NextRequest): Promise<NextResponse> {
  // No database in this build: no session to refresh.
  if (!isSupabaseConfigured()) return NextResponse.next();
  const { supabase, response } = createProxySupabaseClient(request);
  await supabase.auth.getUser();
  return response();
}
