/**
 * Unit tests for the staff sign-in fetch wrapper.
 *
 * It decides which requests carry the secret key, so a mistake here either
 * sends the key where it must never go (PostgREST, where a request without
 * a user token would run as service_role) or fails to send it where Auth
 * needs it to trust a forwarded address. Both fail silently.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientAddressFrom, staffAuthFetch } from "./auth-fetch.ts";

const URL_BASE = "https://example.supabase.co";
const PUBLISHABLE = "sb_publishable_example";
const SECRET = "sb_secret_example";

function capture(clientAddress: string | null, secretKey: string | null = SECRET) {
  const seen: { url: string; headers: Headers }[] = [];
  const baseFetch: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    seen.push({ url, headers: new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)) });
    return new Response("{}");
  };
  const wrapped = staffAuthFetch({
    supabaseUrl: URL_BASE,
    publishableKey: PUBLISHABLE,
    secretKey: secretKey ?? undefined,
    clientAddress,
    baseFetch,
  });
  return { wrapped, seen };
}

const userCall = { apikey: PUBLISHABLE, Authorization: "Bearer user.jwt.token" };
const anonCall = { apikey: PUBLISHABLE, Authorization: `Bearer ${PUBLISHABLE}` };

describe("staffAuthFetch", () => {
  it("puts the secret key and the visitor's address on a password sign-in, and drops the publishable bearer", async () => {
    const { wrapped, seen } = capture("203.0.113.9");
    await wrapped(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: anonCall });
    assert.equal(seen[0].headers.get("apikey"), SECRET);
    assert.equal(seen[0].headers.get("authorization"), null);
    assert.equal(seen[0].headers.get("sb-forwarded-for"), "203.0.113.9");
  });

  it("does the same on a refresh and on both second-factor steps, keeping the user's own token", async () => {
    const { wrapped, seen } = capture("2001:db8::1");
    await wrapped(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: anonCall });
    await wrapped(`${URL_BASE}/auth/v1/factors/abc/challenge`, { method: "POST", headers: userCall });
    await wrapped(`${URL_BASE}/auth/v1/factors/abc/verify`, { method: "POST", headers: userCall });
    for (const call of seen) assert.equal(call.headers.get("apikey"), SECRET);
    assert.equal(seen[1].headers.get("authorization"), "Bearer user.jwt.token");
    assert.equal(seen[2].headers.get("sb-forwarded-for"), "2001:db8::1");
  });

  it("never sends the secret key anywhere else", async () => {
    const { wrapped, seen } = capture("203.0.113.9");
    await wrapped(`${URL_BASE}/rest/v1/profiles?select=role`, { headers: userCall });
    await wrapped(`${URL_BASE}/rest/v1/rpc/sign_in_begin`, { method: "POST", headers: anonCall });
    await wrapped(`${URL_BASE}/storage/v1/object/sign/x`, { method: "POST", headers: userCall });
    await wrapped(`${URL_BASE}/auth/v1/user`, { headers: userCall });
    await wrapped(`${URL_BASE}/auth/v1/factors`, { method: "POST", headers: userCall });
    await wrapped(`${URL_BASE}/auth/v1/logout?scope=local`, { method: "POST", headers: userCall });
    await wrapped(`${URL_BASE}/auth/v1/token?grant_type=pkce`, { method: "POST", headers: anonCall });
    await wrapped(`https://elsewhere.example/auth/v1/token?grant_type=password`, { method: "POST", headers: anonCall });
    for (const call of seen) {
      assert.equal(call.headers.get("apikey"), PUBLISHABLE, call.url);
      assert.equal(call.headers.get("sb-forwarded-for"), null, call.url);
    }
  });

  it("changes nothing when no secret key is configured", async () => {
    const { wrapped, seen } = capture("203.0.113.9", null);
    await wrapped(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: anonCall });
    assert.equal(seen[0].headers.get("apikey"), PUBLISHABLE);
    assert.equal(seen[0].headers.get("sb-forwarded-for"), null);
  });

  it("sends the key but no address when the platform gave none", async () => {
    const { wrapped, seen } = capture(null);
    await wrapped(`${URL_BASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: anonCall });
    assert.equal(seen[0].headers.get("apikey"), SECRET);
    assert.equal(seen[0].headers.get("sb-forwarded-for"), null);
  });
});

describe("clientAddressFrom", () => {
  it("reads only Netlify's own header, and only an address", () => {
    assert.equal(clientAddressFrom(new Headers({ "x-nf-client-connection-ip": "203.0.113.9" })), "203.0.113.9");
    assert.equal(clientAddressFrom(new Headers({ "x-nf-client-connection-ip": "2001:db8::1" })), "2001:db8::1");
    assert.equal(clientAddressFrom(new Headers({ "x-forwarded-for": "203.0.113.9" })), null);
    assert.equal(clientAddressFrom(new Headers({ "x-nf-client-connection-ip": "<script>" })), null);
    assert.equal(clientAddressFrom(new Headers()), null);
  });
});
