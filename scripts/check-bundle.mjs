// Fails the build if the Supabase service-role key could reach a browser.
// Runs after every `npm run build` (the postbuild script), so a deploy that
// would leak it never goes out. Netlify builds with `npm run build`.
//
//   node scripts/check-bundle.mjs [build-dir]     default: .next
//
// Two checks:
//
//   1. THE NAME, in everything served to a browser: .next/static, source
//      maps included. Client code that so much as mentions
//      SUPABASE_SERVICE_ROLE_KEY is trying to read it, and must not exist.
//      Server output is exempt: the server reads the key by name, and its
//      source maps carry that source. They are never served.
//
//   2. THE VALUE, anywhere in the build output, server code and every source
//      map included. The key is read from the environment at runtime and is
//      never compiled in, so finding it anywhere means it was inlined. Three
//      ways to recognise it, so the check works with no key configured:
//        - the configured value (environment, then .env.local);
//        - any JWT whose payload says "role": "service_role" (legacy keys);
//        - any new-style secret key (sb_secret_...).
//
// .next/cache is skipped: it is the compiler's own cache, never deployed.
// No dependency: plain Node.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const BUILD_DIR = process.argv[2] ?? ".next";
const NAME = "SUPABASE_SERVICE_ROLE_KEY";
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g;
const SECRET_KEY = /sb_secret_[A-Za-z0-9_-]{10,}/;
const TEXT = /\.(js|mjs|cjs|map|json|html|css|txt|rsc|body|meta)$/;

function configuredValue() {
  if (process.env[NAME]) return process.env[NAME];
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${NAME}=`));
  const value = line?.slice(NAME.length + 1).trim();
  return value ? value : null;
}

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (relative(BUILD_DIR, path) === "cache") continue;
      yield* files(path);
    } else if (TEXT.test(entry)) {
      yield path;
    }
  }
}

function isServiceRoleJwt(payloadSegment) {
  try {
    const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

if (!existsSync(BUILD_DIR)) {
  console.error(`check-bundle: ${BUILD_DIR} does not exist. Run the build first.`);
  process.exit(1);
}

const value = configuredValue();
const staticDir = join(BUILD_DIR, "static") + sep;
const failures = [];
let scanned = 0;

for (const path of files(BUILD_DIR)) {
  scanned += 1;
  const text = readFileSync(path, "utf8");
  const where = relative(".", path);
  if (path.startsWith(staticDir) && text.includes(NAME)) {
    failures.push(`${where}: names ${NAME} in code served to browsers`);
  }
  if (value && text.includes(value)) {
    failures.push(`${where}: contains the configured service-role key`);
  }
  for (const match of text.matchAll(JWT)) {
    if (isServiceRoleJwt(match[1])) {
      failures.push(`${where}: contains a service_role JWT`);
      break;
    }
  }
  if (SECRET_KEY.test(text)) {
    failures.push(`${where}: contains a Supabase secret key (sb_secret_...)`);
  }
}

if (failures.length > 0) {
  console.error("check-bundle: the service-role key could reach a browser.\n");
  for (const failure of failures) console.error(`  FAIL  ${failure}`);
  console.error("\nSee src/lib/supabase/admin.ts for how it is meant to be kept server-side.");
  process.exit(1);
}
console.log(
  `check-bundle: ${scanned} files in ${BUILD_DIR} scanned (source maps included); ` +
    `no service-role key, and its name nowhere in browser code.` +
    (value ? "" : ` (No ${NAME} configured: matched by shape only.)`),
);
