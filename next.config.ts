import path from "node:path";

import type { NextConfig } from "next";

import { assertDeployTarget } from "./src/lib/supabase/env";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Pin the workspace root to this directory. Without it Turbopack walks up
    // looking for a lockfile and finds an unrelated one in the user's home
    // folder, which it then warns about on every build.
    root: path.resolve(__dirname),
  },
};

// Next calls this on `next dev`, `next build` and `next start`, after loading
// the .env files. The one check here is the deploy target: a staging or
// production APP_ENV with a local Supabase URL refuses to boot. Missing
// Supabase variables are NOT checked here; the client checks them when it is
// constructed (src/lib/supabase/env.ts), so a build that never touches
// Supabase needs none of them.
export default function config(): NextConfig {
  assertDeployTarget();
  return nextConfig;
}
