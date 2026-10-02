import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { staffHome, staffSetUp, staffSignIn, staffVerify } from "@/content/staff";
import { expectStackRunning, stack } from "./db";
import { freshWindow, totp } from "./totp";

/**
 * @db: staff sign-in against the real local stack (build step 6).
 *
 * Seeded accounts (supabase/LOCAL.md), password `local-password-only`:
 *   platform.admin   the full path: set up, sign out, sign in again
 *   research.analyst the attempt limit, and nothing else
 *
 * IDEMPOTENT: afterAll clears the sign-in count of every address the suite
 * used, through reset_sign_in_attempts (migration 15, service role only),
 * so no account is left locked. Nothing clears it at the start: the lockout
 * test opens by signing research.analyst in with the right password, which
 * proves the previous run's teardown worked.
 *   job.seeker       an account that is not staff
 *
 * Before the full path, platform.admin's factors are removed through the
 * Auth admin API, as an operator would by the runbook in
 * supabase/STAFF-ACCESS.md, so every run starts at first sign-in.
 */

const PASSWORD = "local-password-only";
const ADMIN = { id: "00000000-0000-4000-8000-000000000002", email: "platform.admin@example.test" };
const LOCKED = "research.analyst@example.test";
const NOT_STAFF = "job.seeker@example.test";
const UNKNOWN = `nobody-db-test@example.test`;

async function clearSignInCount(request: APIRequestContext, email: string) {
  const { url, serviceRoleKey } = stack();
  const cleared = await request.post(`${url}/rest/v1/rpc/reset_sign_in_attempts`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    data: { email },
  });
  expect(cleared.status()).toBe(200);
}

async function removeFactors(request: APIRequestContext, userId: string) {
  const { url, serviceRoleKey } = stack();
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const listed = await request.get(`${url}/auth/v1/admin/users/${userId}/factors`, { headers });
  expect(listed.status()).toBe(200);
  for (const factor of (await listed.json()) as { id: string }[]) {
    const removed = await request.delete(`${url}/auth/v1/admin/users/${userId}/factors/${factor.id}`, { headers });
    expect(removed.ok()).toBe(true);
  }
}

async function enterPassword(page: Page, email: string, password = PASSWORD) {
  await page.locator(`#${staffSignIn.fields.email.id}`).fill(email);
  await page.locator(`#${staffSignIn.fields.password.id}`).fill(password);
  await page.getByRole("button", { name: staffSignIn.submit.label }).click();
}

async function enterCode(page: Page, code: string, submitLabel: string) {
  await page.locator(`#${staffVerify.field.id}`).fill(code);
  await page.getByRole("button", { name: submitLabel }).click();
}

/**
 * A password attempt expected to fail: it waits for the attempt to finish
 * (the button goes busy and back), because the message from a previous
 * failure is already on the page. Then: the generic message, focused,
 * still on sign-in.
 */
async function expectRefused(page: Page, email: string, password = PASSWORD) {
  await enterPassword(page, email, password);
  const button = page.locator('main form button[type="submit"]');
  await expect(button).toHaveText(staffSignIn.submit.busyLabel);
  await expect(button).toHaveText(staffSignIn.submit.label, { timeout: 15_000 });
  const outcome = page.getByRole("status");
  await expect(outcome).toHaveText(staffSignIn.failed);
  await expect(outcome).toBeFocused();
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
}

test.describe("@db staff sign-in", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await expectStackRunning(request);
  });

  test.afterAll(async ({ request }) => {
    for (const email of [ADMIN.email, LOCKED, NOT_STAFF, UNKNOWN]) await clearSignInCount(request, email);
  });

  test("the staff area sends a visitor with no session to sign-in", async ({ page }) => {
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/staff\/sign-in$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("first sign-in: password, set up the app, a wrong code, then in; sign out; sign in again", async ({
    page,
    context,
    request,
  }) => {
    await removeFactors(request, ADMIN.id);

    await page.goto("/staff/sign-in");
    await enterPassword(page, ADMIN.email);
    await expect(page).toHaveURL(/\/staff\/sign-in\/set-up$/);

    // A password alone does not reach the staff area.
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/staff\/sign-in\/set-up$/);

    await page.getByRole("button", { name: staffSetUp.start.label }).click();
    await expect(page.getByRole("img", { name: staffSetUp.scan.qrLabel })).toBeVisible();
    const secret = (await page.locator("[data-totp-secret]").textContent())!.trim();
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);

    await enterCode(page, "000000", staffSetUp.submit.label);
    await expect(page.getByRole("status")).toHaveText(staffSetUp.failed);
    await expect(page.getByRole("status")).toBeFocused();

    await freshWindow();
    await enterCode(page, totp(secret), staffSetUp.submit.label);
    await expect(page).toHaveURL(/\/staff$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(staffHome.heading);

    // The session: HttpOnly, sent only to /staff, SameSite=Lax.
    const session = (await context.cookies()).filter((cookie) => cookie.name.startsWith("sb-"));
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session) {
      expect(cookie).toMatchObject({ httpOnly: true, path: "/staff", sameSite: "Lax" });
    }

    await page.getByRole("button", { name: staffHome.signOut }).click();
    await expect(page).toHaveURL(/\/staff\/sign-in$/);
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/staff\/sign-in$/);

    // Signing in again goes to the code, not to setup. Wait for the next
    // 30-second window, so this never depends on whether Auth would accept
    // the code used for setup a second time.
    await enterPassword(page, ADMIN.email);
    await expect(page).toHaveURL(/\/staff\/sign-in\/verify$/);
    await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500);
    await enterCode(page, totp(secret), staffVerify.submit.label);
    await expect(page).toHaveURL(/\/staff$/);
  });

  test("a staff password alone reads nothing from the database", async ({ request }) => {
    // Straight at the API, past the page: the token Auth issues for a
    // password is aal1, and a staff role does not count at aal1.
    const { url, anonKey, serviceRoleKey } = stack();
    const signedIn = await request.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      data: { email: ADMIN.email, password: PASSWORD },
    });
    expect(signedIn.status()).toBe(200);
    const { access_token } = (await signedIn.json()) as { access_token: string };

    const asStaff = await request.get(`${url}/rest/v1/contact_messages?select=id&limit=5`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
    });
    expect(await asStaff.json()).toEqual([]);
    const asService = await request.get(`${url}/rest/v1/contact_messages?select=id&limit=5`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    expect(((await asService.json()) as unknown[]).length).toBeGreaterThan(0);
  });

  test("a wrong password, an unknown address and a non-staff account all read the same, and take as long", async ({
    page,
  }) => {
    await page.goto("/staff/sign-in");
    for (const [email, password] of [
      [ADMIN.email, "not-the-password"],
      [UNKNOWN, PASSWORD],
      [NOT_STAFF, PASSWORD],
    ]) {
      const started = Date.now();
      await expectRefused(page, email, password);
      expect(Date.now() - started).toBeGreaterThanOrEqual(1_400);
    }
    // The non-staff account was signed straight out again.
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/staff\/sign-in$/);
  });

  test("past five attempts, even the right password is refused", async ({ page }) => {
    // Not locked to begin with: the last run's teardown cleared it.
    await page.goto("/staff/sign-in");
    await enterPassword(page, LOCKED);
    await expect(page).toHaveURL(/\/staff\/sign-in\/set-up$/);
    await page.getByRole("button", { name: staffSetUp.startOver }).click();
    await expect(page).toHaveURL(/\/staff\/sign-in$/);

    for (let n = 0; n < 5; n++) {
      await expectRefused(page, LOCKED, `wrong-${n}`);
    }
    await expectRefused(page, LOCKED);
  });
});
