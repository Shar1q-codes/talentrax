// `npm run build` with the Supabase connection deliberately blanked, for the
// browser suite that runs without a database (`npm run test:browser`).
//
// Why blanked and not just absent: next build reads .env.local, and a
// developer's .env.local points at the local stack. Next never lets a .env
// file override a variable that is already set, even to an empty string
// (@next/env), so setting both to "" here wins. The build then has no
// database, the forms gate closes every wired form, and the suite sees
// exactly what a deploy without Supabase would serve.
//
// The @db suite (`npm run test:browser:db`) builds with the real values
// instead.

import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  },
});
process.exit(result.status ?? 1);
