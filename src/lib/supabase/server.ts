import "server-only";

// The server client: the anon key plus the signed-in user's session, read
// from and written to cookies. RLS applies as that user. For staff pages,
// server actions and route handlers that act on someone's behalf.
//
// THE SESSION IS AN HTTPONLY COOKIE (CLAUDE.md, "The account screens",
// security rule 2). @supabase/ssr writes cookies JavaScript can read unless
// told otherwise, so every cookie it sets passes through SESSION_COOKIE,
// which forces HttpOnly, Secure and SameSite=Lax. Nothing signs in from the
// browser, so nothing in the browser needs to read them.
//
// SCOPED TO /staff. The only sessions are staff sessions, so the cookie is
// sent only to the staff pages and their server actions, never with a
// visitor-facing request (and the privacy policy says so).
//
// One client per request: it carries that request's cookies. In a server
// component the cookie store is read-only, so a token refresh there cannot
// be written; the proxy refreshes sessions on staff routes before the page
// renders (createProxySupabaseClient, below).

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "../database.types";
import { readSupabaseEnv } from "./env";

/** Applied over whatever @supabase/ssr asks for, on every cookie it sets. */
export const SESSION_COOKIE: CookieOptions = {
  httpOnly: true,
  // Browsers treat http://localhost as secure, so local runs work too.
  secure: true,
  sameSite: "lax",
  path: "/staff",
};

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = readSupabaseEnv();
  const store = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            store.set(name, value, { ...options, ...SESSION_COOKIE });
          }
        } catch {
          // A server component: cookies are read-only during render. The
          // proxy has already refreshed the session for this request.
        }
      },
    },
  });
}

// The same client for the proxy, which reads the request's cookies and
// writes refreshed ones onto the response it returns. `response()` is read
// after the auth call: a refresh replaces it.
export function createProxySupabaseClient(request: NextRequest): {
  supabase: SupabaseClient<Database>;
  response: () => NextResponse;
} {
  const { url, anonKey } = readSupabaseEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, anonKey, {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, { ...options, ...SESSION_COOKIE });
        }
      },
    },
  });
  return { supabase, response: () => response };
}
