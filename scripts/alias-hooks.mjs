// Teaches plain Node the "@/" path alias from tsconfig.json, so `npm test`
// can run the TypeScript sources directly with no bundler, transform step or
// dependency.
//
// The tests run on Node's own type stripping, which does not read tsconfig
// paths. Without this, a tested module could only reach another top-level
// folder by a relative path, and those are not allowed (CLAUDE.md, "Feature
// boundaries").
//
// One rule, matching tsconfig: "@/x" is "src/x". Every alias in tsconfig is
// a prefix of src/, so the one mapping covers them all. Specifiers keep
// their explicit .ts extension, which Node requires.

import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const SRC = pathToFileURL(`${import.meta.dirname}/../src/`).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(SRC + specifier.slice(2), context);
    }
    return nextResolve(specifier, context);
  },
});
