import "server-only";

// Whether the public forms that are wired to the database say they are open.
//
// ONE SWITCH, three things follow it, so they can never disagree:
//   - the "not open yet" notice above each wired form (shown when closed);
//   - whether a valid submit reaches the database (when closed, the form
//     answers "not open yet, nothing was sent" and sends nothing);
//   - the storage disclosure on /privacy-policy (shown when open).
//
// Read at BUILD time: every page here is statically generated, and the
// NEXT_PUBLIC_* values the browser client uses are inlined by the same
// build. So the page and the bundle always agree. Changing the answer takes
// a rebuild, like every other environment variable here.
//
// Server-only because APP_ENV is not NEXT_PUBLIC_ and reads as unset in a
// browser, which would mean "local".
//
// The rule, branch by branch, is decideFormsOpen() in env.ts, where npm test
// pins it. In short: closed with no database configured; locally, open only
// against the local stack; on staging, open; in production, open only when
// every PRODUCTION_RELEASE condition below holds.

import { formStorage } from "@/content/legal";

import { decideFormsOpen, decideResumeAccess, readAppEnv } from "./env";

// What production waits on before a wired form may take a real submission.
// Named, not inferred, so nobody deletes the check as dead code: each one is
// a release decision, and it is flipped in the commit that makes it true.
export const PRODUCTION_RELEASE = {
  // The privacy policy says where submissions are stored. Set by filling in
  // formStorage.location in content/legal.ts once the hosted project exists.
  storageLocationPublished: formStorage.location !== null,
  // Someone reads what arrives. The staff inbox exists (build step 8,
  // /staff/inbox); what is still missing is a named staff account on the
  // production project that can sign in to it with a second factor, made by
  // supabase/snippets/promote_staff.sql (supabase/STAFF-ACCESS.md). Nothing in
  // the build can observe that, so this is set by hand, in the commit that
  // records who it is.
  inboxStaffed: false,
} as const;

// THE RESUME FORM'S RELEASE GATE (CLIENT-CONFIRM.md, the note at the top).
// /job-seekers/upload-resume must not be publicly reachable in production
// until every condition below holds: each of the client's items 1 to 8,
// answered and written into the privacy policy, terms or contact page, and
// the policy through the client's lawyer. Until then, in production, the public route is a 404
// and the form lives behind staff sign-in at /staff/upload-resume, so the
// production code path can be tried by staff without the public reaching it.
//
// FLIPPING THESE IS A DELIBERATE RELEASE STEP, not a cleanup. Each is set by
// hand, in the commit that records the answer, and the guard they drive is
// not dead code while any is false.
export const RESUME_PUBLIC_RELEASE = {
  // CLIENT-CONFIRM.md, by item number. Each is the client's answer, written
  // into the page that needs it (its OMITTED marker in content/legal.ts gone).
  item1RetentionAnswered: false,
  item2ProcessorsNamed: false,
  item3DataRightsContactAnswered: false,
  item4InternationalTransfersAnswered: false,
  item5HostingAndLogsAnswered: false,
  item6SaleAndSharingAnswered: false,
  item7GoverningLawAnswered: false,
  item8ContactDetailsAnswered: false,
  // The privacy policy, with all of the above in it, has been through the
  // client's lawyer.
  lawyerReviewed: false,
} as const;

function inputs() {
  return {
    appEnv: readAppEnv(),
    // By literal name: the same values the browser bundle has inlined.
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    productionReleased: Object.values(PRODUCTION_RELEASE).every(Boolean),
  };
}

function resumeAccess() {
  return decideResumeAccess({ ...inputs(), resumePublished: Object.values(RESUME_PUBLIC_RELEASE).every(Boolean) });
}

/** Contact and Request Talent. */
export function publicFormsOpen(): boolean {
  return decideFormsOpen(inputs());
}

/**
 * Whether the public resume route exists at all. Everywhere but production
 * it does (unlisted, noindex). In production, only once the release gate
 * clears; until then it is a 404.
 */
export function resumeRoutePublic(): boolean {
  return resumeAccess().routePublic;
}

/** The public resume form takes submissions: the route exists, and the forms gate is open. */
export function resumeFormOpenToPublic(): boolean {
  return resumeAccess().openToPublic;
}

/**
 * The resume form at /staff/upload-resume, for signed-in staff: open
 * wherever a database is configured for the environment, production
 * included, so staff can try the real path before the public can. Who is
 * signed in is the page's and the endpoints' check, not this one.
 */
export function resumeFormOpenToStaff(): boolean {
  return resumeAccess().openToStaff;
}
