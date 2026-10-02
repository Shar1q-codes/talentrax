import { createHmac } from "node:crypto";

/**
 * A time-based one-time code (RFC 6238: SHA-1, 30 seconds, six digits), for
 * the @db staff sign-in tests to play the part of a phone's authenticator.
 * Only the tests use it; the site never computes a code.
 */

function base32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/=+$/, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error(`not base32: ${char}`);
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const digest = createHmac("sha1", base32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

/** Wait, if needed, until a code has at least `margin` ms left to live. */
export async function freshWindow(margin = 5_000) {
  const left = 30_000 - (Date.now() % 30_000);
  if (left < margin) await new Promise((resolve) => setTimeout(resolve, left + 250));
}
