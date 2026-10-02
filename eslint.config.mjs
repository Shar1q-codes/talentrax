import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Feature boundaries (CLAUDE.md). Two rules, enforced here rather than
// remembered:
//
// - A feature's internals are private: outside src/features/<name>/, import
//   it as "@/features/<name>", or its server-only half as
//   "@/features/<name>/server", and nothing deeper. Tests may import a
//   feature's *.fixture.ts directly, because fixtures are never exported from
//   an index - that is what keeps them out of the build.
// - All database access lives in a feature's queries.ts (may be bundled for
//   the browser: the browser client only) and queries.server.ts
//   (server-only: the session and service-role clients). Nothing else may
//   import the Supabase clients or the SDK, so two files per feature list
//   every query that feature can make.
//
// A later block replaces no-restricted-imports wholesale, so each block
// restates the patterns it keeps.
const deepFeatureImport = {
  regex: "^@/features/[^/]+/(?!server$).+",
  message:
    'Import a feature through "@/features/<name>", or "@/features/<name>/server" for its server-only half. Its internals are private.',
};
const deepFeatureImportExceptFixtures = {
  regex: "^@/features/[^/]+/(?!server$)(?!.*\\.fixture(\\.ts)?$).+",
  message: deepFeatureImport.message,
};
const databaseAccess = {
  group: ["@supabase/*", "@/lib/supabase/*"],
  message:
    "Database access lives in a feature's queries.ts or queries.server.ts, never in a component, page, layout or route handler.",
};
// queries.ts can end up in a client component's bundle, so it may reach the
// browser client only. The session and service-role clients are server-only.
const serverClients = {
  group: ["@supabase/ssr", "@/lib/supabase/server", "@/lib/supabase/admin"],
  message:
    "queries.ts may be bundled for the browser: use the browser client here, and put session or service-role access in queries.server.ts.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [deepFeatureImport, databaseAccess] }],
    },
  },
  {
    files: ["src/features/*/queries.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [deepFeatureImport, serverClients] }],
    },
  },
  {
    files: ["src/features/*/queries.server.ts", "src/lib/supabase/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [deepFeatureImport] }],
    },
  },
  {
    files: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [deepFeatureImportExceptFixtures, databaseAccess] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
