import path from "node:path";

import type { NextConfig } from "next";

import { assertSupabaseEnv } from "./src/lib/supabase/env";

// Startup assertion. Next evaluates this file on `next dev`, `next build` and
// `next start`, after loading the .env files, so a missing Supabase variable,
// or a production build pointed at a local stack, stops all three before
// anything is served or deployed.
assertSupabaseEnv();

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Pin the workspace root to this directory. Without it Turbopack walks up
    // looking for a lockfile and finds an unrelated one in the user's home
    // folder, which it then warns about on every build.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
