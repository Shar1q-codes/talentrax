// The fetch the session client uses: the secret key on staff sign-in calls
// to Supabase Auth, and on nothing else.
//
// WHY. Staff sign in through our server, so Supabase Auth's per-IP rate
// limits see our server's address for every staff member and every
// attacker alike. Hosted Auth can count by the visitor's address instead,
// from an `Sb-Forwarded-For` header - but it trusts that header only on a
// request made with a secret key, and only once forwarding is enabled for
// the project (supabase/STAFF-ACCESS.md, "Two paths to the password").
//
// WHICH CALLS. Exactly the ones Auth rate-limits by address on a sign-in:
//   POST /auth/v1/token?grant_type=password
//   POST /auth/v1/token?grant_type=refresh_token
//   POST /auth/v1/factors/<id>/challenge
//   POST /auth/v1/factors/<id>/verify
// Everything else - every PostgREST and Storage request, every other Auth
// call - goes out exactly as supabase-js built it, with the publishable key
// and the user's own token. The secret key never reaches PostgREST through
// this client, so a request that lost its user token is anon, not
// service_role.
//
// The visitor's address is sent only when the platform told us what it is
// (`clientAddressFrom`). Until forwarding is enabled on the project, Auth
// ignores the header, and nothing changes but the key.
//
// No environment access and no `server-only` here, so `npm test` can drive
// it: server.ts, which is server-only, reads the key and passes it in.

export type AuthFetchOptions = {
  supabaseUrl: string;
  publishableKey: string;
  /** Unset: every call goes out unchanged (forwarding needs the secret key). */
  secretKey: string | undefined;
  /** The visitor's address, or null when the platform did not say. */
  clientAddress: string | null;
  baseFetch?: typeof fetch;
};

const FACTOR_STEP = /^\/auth\/v1\/factors\/[^/]+\/(challenge|verify)$/;

function isSignInCall(target: URL, method: string): boolean {
  if (method !== "POST") return false;
  if (target.pathname === "/auth/v1/token") {
    const grant = target.searchParams.get("grant_type");
    return grant === "password" || grant === "refresh_token";
  }
  return FACTOR_STEP.test(target.pathname);
}

export function staffAuthFetch(options: AuthFetchOptions): typeof fetch {
  const { supabaseUrl, publishableKey, secretKey, clientAddress } = options;
  const baseFetch = options.baseFetch ?? fetch;
  const origin = new URL(supabaseUrl).origin;

  return (input, init) => {
    if (!secretKey) return baseFetch(input, init);
    const request = input instanceof Request ? input : null;
    const target = new URL(request ? request.url : input.toString());
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    if (target.origin !== origin || !isSignInCall(target, method)) return baseFetch(input, init);

    const headers = new Headers(init?.headers ?? request?.headers);
    headers.set("apikey", secretKey);
    // supabase-js may also send the publishable key as a bearer token on a
    // call made without a user. That is not a token Auth should weigh
    // against the secret key, so it goes. A user's own token stays.
    if (headers.get("Authorization") === `Bearer ${publishableKey}`) headers.delete("Authorization");
    if (clientAddress) headers.set("Sb-Forwarded-For", clientAddress);
    return baseFetch(input, { ...init, headers });
  };
}

const ADDRESS = /^[0-9A-Fa-f:.]{2,45}$/;

/**
 * The visitor's address, from the one header our host sets itself and a
 * client cannot write: Netlify's `x-nf-client-connection-ip`. Not
 * X-Forwarded-For, whose leftmost entries are whatever the client claimed.
 * Anywhere else (locally, under `next start`) there is no such header, and
 * nothing is forwarded.
 */
export function clientAddressFrom(headers: Headers): string | null {
  const value = headers.get("x-nf-client-connection-ip")?.trim();
  return value && ADDRESS.test(value) ? value : null;
}
