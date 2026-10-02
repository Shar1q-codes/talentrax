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

import { decideFormsOpen, readAppEnv } from "./env";

// What production waits on before a wired form may take a real submission.
// Named, not inferred, so nobody deletes the check as dead code: each one is
// a release decision, and it is flipped in the commit that makes it true.
export const PRODUCTION_RELEASE = {
  // The privacy policy says where submissions are stored. Set by filling in
  // formStorage.location in content/legal.ts once the hosted project exists.
  storageLocationPublished: formStorage.location !== null,
  // Someone reads what arrives: the staff inbox (build step 8) exists, and a
  // named staff account can sign in to it with a second factor
  // (supabase/STAFF-ACCESS.md). Nothing in the build can observe either, so
  // this is set by hand.
  inboxStaffed: false,
} as const;

export function publicFormsOpen(): boolean {
  return decideFormsOpen({
    appEnv: readAppEnv(),
    // By literal name: the same values the browser bundle has inlined.
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    productionReleased: Object.values(PRODUCTION_RELEASE).every(Boolean),
  });
}
