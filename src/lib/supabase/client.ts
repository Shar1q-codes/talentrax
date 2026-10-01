// The one Supabase client constructor. Nothing on the site calls it yet.
//
// The anon key is public by design: what it can reach is decided by RLS, and
// anon can SELECT nothing (supabase/README.md). Anything that reads data, the
// job board included, does so server-side.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { readSupabaseEnv } from "./env";

export function createSupabaseClient(): SupabaseClient<Database> {
  const { url, anonKey } = readSupabaseEnv();
  return createClient<Database>(url, anonKey);
}
