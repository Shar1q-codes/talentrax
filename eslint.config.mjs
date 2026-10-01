import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Feature boundaries (CLAUDE.md). Two rules, enforced here rather than
// remembered:
//
// - A feature's internals are private: outside src/features/<name>/, import
//   it as "@/features/<name>" and nothing deeper. Tests may import a
//   feature's *.fixture.ts directly, because fixtures are never exported from
//   an index - that is what keeps them out of the build.
// - All database access lives in a feature's queries.ts. Nothing else may
//   import the Supabase client or the SDK, so one file per feature lists
//   every query that feature can make.
//
// A later block replaces no-restricted-imports wholesale, so each block
// restates the patterns it keeps.
const deepFeatureImport = {
  regex: "^@/features/[^/]+/.+",
  message: 'Import a feature through its index, "@/features/<name>". Its internals are private.',
};
const deepFeatureImportExceptFixtures = {
  regex: "^@/features/[^/]+/(?!.*\\.fixture(\\.ts)?$).+",
  message: deepFeatureImport.message,
};
const databaseAccess = {
  group: ["@supabase/*", "@/lib/supabase/*"],
  message: "Database access lives in a feature's queries.ts, never in a component, page, layout or route handler.",
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
    files: ["src/features/*/queries.ts", "src/lib/supabase/**"],
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
