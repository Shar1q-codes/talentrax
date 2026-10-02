import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

/**
 * The @db browser suite: `npm run test:browser:db`.
 *
 * Kept apart from `npm run test:browser`, which builds with no database and
 * must keep passing on a machine with no Supabase stack at all. This one
 * needs the local stack running (`npm run db:start`) and a build that points
 * at it: the script builds with .env.local's values, so the forms gate opens
 * the wired forms, and these tests submit them for real and read back what
 * the database stored.
 *
 * Same production build and `next start` as the main suite. Only tests
 * tagged @db run here, and the main suite never runs them.
 */
export default defineConfig({
  ...base,
  projects: [{ name: "db", grep: /@db/, use: { headless: true } }],
  outputDir: "test-results/browser-db",
});
