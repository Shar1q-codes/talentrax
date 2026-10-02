// The browser client: the publishable key, and no session of any kind.
//
// For the three public forms, which insert straight from the visitor's
// browser. That is deliberate, not a shortcut: the rate limit on those forms
// (migration 9) keys on the client address that Supabase's edge records for
// the request. Through our own server, every visitor would share the
// server's address and one limit; through the service role, nobody would be
// limited at all.
//
// The publishable key is public by design: RLS confines it to inserting the form
// fields of those three tables, and it can SELECT nothing
// (supabase/README.md).
//
// NO SESSION. supabase-js persists a session in localStorage by default,
// which this site never uses (CLAUDE.md, rule 7), and nothing signs in from
// the browser: a staff session is an HttpOnly cookie the server sets
// (server.ts). So nothing is persisted, refreshed or read from the URL.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { readSupabaseEnv } from "./env";

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  const { url, publishableKey } = readSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
