import "server-only";

// The service-role client. It bypasses RLS, so it is the most dangerous
// object in this repo, and it is kept to the fewest possible callers: the
// resume-upload endpoints, which must look up a row anon cannot read and
// mint a signed upload URL for it. Nothing else.
//
// HOW THE KEY STAYS OFF THE CLIENT BUNDLE:
//   - its name has no NEXT_PUBLIC_ prefix, so `next build` never inlines it;
//   - `import "server-only"` above makes any client import a build error;
//   - eslint allows this module only in a feature's queries.server.ts;
//   - after every build, scripts/check-bundle.mjs fails if the key's name
//     appears in anything served to a browser, or its value anywhere in the
//     build output, source maps included.
//
// No session: it acts as the service role, never as a person.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { readSupabaseEnv } from "./env";

export function createAdminSupabaseClient(): SupabaseClient<Database> {
  const { url } = readSupabaseEnv();
  // Read by its literal name, at the point of use, like the public pair.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Service-role Supabase client constructed without SUPABASE_SERVICE_ROLE_KEY. " +
        "Locally: it is in .env.local.example. Deployed: set it in the runtime environment " +
        "(Netlify: Site configuration > Environment variables, scoped to Functions), never as " +
        "NEXT_PUBLIC_. See supabase/LOCAL.md.",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
