import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Helpers for the @db suite only: the local Supabase stack, read as the
 * service role to see what a form really stored.
 *
 * Nothing here runs at import. The main suite collects every spec file,
 * this one's included, on machines with no stack and no .env.local.
 */

type Stack = { url: string; publishableKey: string; secretKey: string };

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

let cached: Stack | null = null;

/** The same values `npm run build` used: the environment, then .env.local. */
export function stack(): Stack {
  if (cached) return cached;
  const file = readEnvFile(".env.local");
  const pick = (name: string) => process.env[name] || file[name] || "";
  const url = pick("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const secretKey = pick("SUPABASE_SECRET_KEY");
  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      "The @db suite needs the local stack's URL, publishable key and secret key in .env.local " +
        "(copy .env.local.example, then SECRET_KEY from `npx supabase status -o env`). See supabase/LOCAL.md.",
    );
  }
  cached = { url, publishableKey, secretKey };
  return cached;
}

/** Fails the suite with a plain instruction when the stack is not up. */
export async function expectStackRunning(request: APIRequestContext) {
  const { url, publishableKey } = stack();
  const response = await request
    .get(`${url}/rest/v1/`, { headers: { apikey: publishableKey }, timeout: 5_000 })
    .catch(() => null);
  expect(response, "The local Supabase stack is not running: npm run db:start").not.toBeNull();
}

/** Rows as the service role sees them: RLS does not apply. */
export async function selectRows<T = Record<string, unknown>>(
  request: APIRequestContext,
  table: string,
  query: string,
): Promise<T[]> {
  const { url, secretKey } = stack();
  const response = await request.get(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as T[];
}

/** An insert as an anonymous visitor at `ip`: what the form does, minus the form. */
export async function insertAsVisitor(
  request: APIRequestContext,
  table: string,
  row: Record<string, unknown>,
  ip: string,
) {
  const { url, publishableKey } = stack();
  return request.post(`${url}/rest/v1/${table}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "cf-connecting-ip": ip,
    },
    data: row,
  });
}

/**
 * A client address no earlier run has used: a fresh /64 inside 2001:db8::/32,
 * the range reserved for documentation. The per-address limit counts an IPv6
 * address by its /64, and its ledger outlives a run by 48 hours.
 */
export function freshVisitorIp(): string {
  const [a, b, c] = [randomBytes(2), randomBytes(2), randomBytes(2)].map((x) => x.toString("hex"));
  return `2001:db8:${a}:${b}:${c}::1`;
}

/**
 * Make every request this page sends to the stack arrive from `ip`, as the
 * edge in front of hosted Supabase would report it. Locally there is no edge,
 * so without this the per-address limit never applies.
 */
export async function visitFrom(page: Page, ip: string) {
  await page.route(`${stack().url}/rest/v1/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": ip } }),
  );
}

/**
 * A marker unique to one test, and an address on a reserved test domain.
 * example.com marks the row is_test (migration 11), so nothing a run leaves
 * behind is mistaken for a real enquiry in the inbox.
 */
export function testRun() {
  const id = randomUUID();
  return { id, email: `db-test-${id.slice(0, 8)}@example.com`, marker: `DB-TEST ${id}` };
}

/** Every request this page sends to the stack, as method and path. */
export function recordStackRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (req) => {
    if (req.url().startsWith(stack().url)) seen.push(`${req.method()} ${new URL(req.url()).pathname}`);
  });
  return seen;
}
