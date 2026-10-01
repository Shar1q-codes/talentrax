// Supabase connection settings, read from the environment with no fallback.
//
// A client that silently points at nothing fails far from the cause, so a
// missing value throws here, naming the variable. next.config.ts calls
// assertSupabaseEnv() so `next dev`, `next build` and `next start` all refuse
// to start without it.
//
// No path-alias imports: next.config.ts loads this file before the alias
// resolver exists.

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

// Each variable is referenced by its literal name. NEXT_PUBLIC_* values are
// inlined into the browser bundle by text substitution, and a computed
// `process.env[name]` would be undefined in the browser.
export function readSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
        "For local development, copy .env.local.example to .env.local and run `npm run db:start`. " +
        "See supabase/LOCAL.md.",
    );
  }

  return { url: url!, anonKey: anonKey! };
}

// The worst deploy available here: a production build wired to a developer's
// local stack. Refuse it outright.
export function assertSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();

  if (
    process.env.NODE_ENV === "production" &&
    (env.url.includes("localhost") || env.url.includes("127.0.0.1"))
  ) {
    throw new Error(
      `Refusing to start: NODE_ENV is production but NEXT_PUBLIC_SUPABASE_URL points at a local stack (${env.url}). ` +
        "A production build must use a hosted Supabase project. See supabase/LOCAL.md, \"Going to hosted\".",
    );
  }

  return env;
}
