// Supabase connection settings, read from the environment with no fallback.
//
// Two checks, at two different times:
//
// - Missing variables are checked at the point of use: readSupabaseEnv(),
//   called by each of the three client constructors (browser.ts, server.ts,
//   admin.ts) when it is called, never at import. So a build with no
//   Supabase variables at all succeeds, and keeps succeeding until code that
//   actually needs the database runs without them.
// - A deployed environment pointed at a local stack is checked at boot:
//   next.config.ts calls assertDeployTarget(), so a staging or production
//   build or server wired to someone's laptop never starts. It only looks at
//   a URL that is set; a missing one is the first check's business.
//
// "Deployed" is APP_ENV, never NODE_ENV. `next build` sets NODE_ENV to
// production on every machine, including a local build served for
// check:seo, so NODE_ENV cannot tell a deploy from a laptop.
//
// No path-alias imports: next.config.ts loads this file before the alias
// resolver exists.

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export type AppEnv = "local" | "staging" | "production";

const APP_ENVS: readonly AppEnv[] = ["local", "staging", "production"];

// Set in the deploy environment only (Netlify, per context). Unset means
// local. A value that is set but unrecognised throws: a typo such as "prod"
// silently meaning local would switch the guard off exactly where it matters.
//
// APP_ENV is not NEXT_PUBLIC_, so it is not inlined into the browser bundle
// and reads as unset there. The boot check in next.config.ts is what covers
// a deployed build; the browser never needs to make that decision itself.
export function readAppEnv(): AppEnv {
  const value = process.env.APP_ENV;
  if (!value) return "local";
  if ((APP_ENVS as readonly string[]).includes(value)) return value as AppEnv;
  throw new Error(
    `APP_ENV is "${value}", which is not one of: ${APP_ENVS.join(", ")}. ` +
      "Set it in the deploy environment (Netlify: Site configuration > Environment variables), " +
      "or leave it unset for local development. See supabase/LOCAL.md.",
  );
}

// Whether this build can reach a database at all: both public values set
// and non-empty. Staff sign-in asks it before constructing a client.
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

// Whether the public forms are open, from what the build knows. The rule
// itself; forms-gate.ts is the server-only caller that reads the inputs.
// Kept here, alias-free and pure, so `npm test` can pin every branch.
//
//   not configured  closed, everywhere (no URL, or no publishable key)
//   local           open only against the local stack: a hosted URL with
//                   APP_ENV unset is a deploy that forgot to say which one
//                   it is, and it must not take real submissions on a guess
//   staging         open
//   production      open only once every release condition holds
export function decideFormsOpen(input: {
  appEnv: AppEnv;
  url: string | undefined;
  publishableKey: string | undefined;
  productionReleased: boolean;
}): boolean {
  if (!input.url || !input.publishableKey) return false;
  switch (input.appEnv) {
    case "local":
      return isLocalUrl(input.url);
    case "staging":
      return true;
    case "production":
      return input.productionReleased;
  }
}

// The resume form's three answers, from the same inputs plus its own
// release gate (RESUME_PUBLIC_RELEASE in forms-gate.ts). Pure, so npm test
// can pin production, which no local build can be.
//
//   routePublic   the public route renders at all: everywhere but
//                 production, and in production only once released
//   openToPublic  the public form takes submissions
//   openToStaff   the form at /staff/upload-resume takes submissions:
//                 wherever a database is configured for the environment,
//                 production included, release or not
export function decideResumeAccess(input: {
  appEnv: AppEnv;
  url: string | undefined;
  publishableKey: string | undefined;
  productionReleased: boolean;
  resumePublished: boolean;
}): { routePublic: boolean; openToPublic: boolean; openToStaff: boolean } {
  const { appEnv, url, publishableKey } = input;
  const routePublic = appEnv !== "production" || input.resumePublished;
  return {
    routePublic,
    openToPublic:
      routePublic &&
      decideFormsOpen({ appEnv, url, publishableKey, productionReleased: input.productionReleased && input.resumePublished }),
    openToStaff: decideFormsOpen({ appEnv, url, publishableKey, productionReleased: true }),
  };
}

function isLocalUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function refuseLocalUrlWhenDeployed(url: string | undefined): void {
  const appEnv = readAppEnv();
  if (appEnv === "local" || !url || !isLocalUrl(url)) return;
  throw new Error(
    `Refusing to start: APP_ENV is ${appEnv} but NEXT_PUBLIC_SUPABASE_URL points at a local stack (${url}). ` +
      `A ${appEnv} deploy must use its own hosted Supabase project. See supabase/LOCAL.md, "Going to hosted".`,
  );
}

// Boot-time check. Called by next.config.ts on `next dev`, `next build` and
// `next start`. Does not require the Supabase variables to exist.
export function assertDeployTarget(): void {
  refuseLocalUrlWhenDeployed(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

// Point-of-use check. Each variable is referenced by its literal name:
// NEXT_PUBLIC_* values are inlined into the browser bundle by text
// substitution, and a computed `process.env[name]` would be undefined there.
export function readSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    const them = missing.length > 1 ? "them" : "it";
    throw new Error(
      `Supabase client constructed without ${missing.join(" and ")}. ` +
        "Locally: copy .env.local.example to .env.local and run `npm run db:start`. " +
        `Deployed: set ${them} in the build environment (Netlify: Site configuration > Environment variables, per context) ` +
        "and rebuild, since NEXT_PUBLIC_* values are inlined at build time. " +
        "See supabase/LOCAL.md.",
    );
  }

  refuseLocalUrlWhenDeployed(url);

  return { url: url!, publishableKey: publishableKey! };
}
