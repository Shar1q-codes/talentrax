import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { staffSetUp, staffSignIn } from "@/content/staff";
import { stack } from "./db";
import { freshWindow, totp } from "./totp";

/**
 * Signing a seeded staff account in, for specs that need a staff session
 * rather than to test sign-in itself (staff.db.spec.ts does that). The
 * account's factors are removed first, through the Auth admin API, as an
 * operator would (supabase/STAFF-ACCESS.md), so every run starts at setup.
 */

export const PASSWORD = "local-password-only";

export async function removeFactors(request: APIRequestContext, userId: string) {
  const { url, secretKey } = stack();
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}` };
  const listed = await request.get(`${url}/auth/v1/admin/users/${userId}/factors`, { headers });
  expect(listed.status()).toBe(200);
  for (const factor of (await listed.json()) as { id: string }[]) {
    const removed = await request.delete(`${url}/auth/v1/admin/users/${userId}/factors/${factor.id}`, { headers });
    expect(removed.ok()).toBe(true);
  }
}

export async function clearSignInCount(request: APIRequestContext, email: string) {
  const { url, secretKey } = stack();
  const cleared = await request.post(`${url}/rest/v1/rpc/reset_sign_in_attempts`, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    data: { email },
  });
  expect(cleared.status()).toBe(200);
}

/** Ends on /staff, past both steps. */
export async function signInAsStaff(page: Page, request: APIRequestContext, account: { id: string; email: string }) {
  await removeFactors(request, account.id);
  await page.goto("/staff/sign-in");
  await page.locator(`#${staffSignIn.fields.email.id}`).fill(account.email);
  await page.locator(`#${staffSignIn.fields.password.id}`).fill(PASSWORD);
  await page.getByRole("button", { name: staffSignIn.submit.label }).click();
  await expect(page).toHaveURL(/\/staff\/sign-in\/set-up$/, { timeout: 15_000 });
  await page.getByRole("button", { name: staffSetUp.start.label }).click();
  const secret = (await page.locator("[data-totp-secret]").textContent())!.trim();
  await freshWindow();
  await page.locator(`#${staffSetUp.field.id}`).fill(totp(secret));
  await page.getByRole("button", { name: staffSetUp.submit.label }).click();
  await expect(page).toHaveURL(/\/staff$/, { timeout: 15_000 });
}
