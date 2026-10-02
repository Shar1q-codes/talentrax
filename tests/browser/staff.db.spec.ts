import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { staffHome, staffSetUp, staffSignIn, staffVerify } from "@/content/staff";
import { expectStackRunning, stack } from "./db";
import { freshWindow, totp } from "./totp";

/**
 * @db: staff sign-in against the real local stack (build step 6).
 *
 * Seeded accounts (supabase/LOCAL.md), password `local-password-only`:
 *   platform.admin   the full path: set up, sign out, sign in again
 *   research.analyst the sign-in delay, and nothing else
 *
 * IDEMPOTENT: afterAll clears the sign-in count of every address the suite
 * used, through reset_sign_in_attempts (migration 15, service role only),
 * so no address is left slowed down. Nothing clears it at the start: the
 * delay test opens by signing research.analyst in with the right password
 * at no delay, which proves the previous run's teardown worked.
 *   job.seeker       an account that is not staff
 *
 * Before the full path, platform.admin's factors are removed through the
 * Auth admin API, as an operator would by the runbook in
 * supabase/STAFF-ACCESS.md, so every run starts at first sign-in.
 */

const PASSWORD = "local-password-only";
const ADMIN = { id: "00000000-0000-4000-8000-000000000002", email: "platform.admin@example.test" };
const DELAYED = "research.analyst@example.test";
const NOT_STAFF = "job.seeker@example.test";
const UNKNOWN = `nobody-db-test@example.test`;

async function clearSignInCount(request: APIRequestContext, email: string) {
  const { url, secretKey } = stack();
  const cleared = await request.post(`${url}/rest/v1/rpc/reset_sign_in_attempts`, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    data: { email },
  });
  expect(cleared.status()).toBe(200);
}

async function removeFactors(request: APIRequestContext, userId: string) {
  const { url, secretKey } = stack();
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}` };
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

/** Part-way through sign-in: sign out and back to the first step. */
async function startOver(page: Page) {
  await page.getByRole("button", { name: staffSetUp.startOver }).click();
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
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
    for (const email of [ADMIN.email, DELAYED, NOT_STAFF, UNKNOWN]) await clearSignInCount(request, email);
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
    // Up to 30 seconds of it is waiting for a fresh code window.
    test.setTimeout(90_000);
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
    const { url, publishableKey, secretKey } = stack();
    const signedIn = await request.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      data: { email: ADMIN.email, password: PASSWORD },
    });
    expect(signedIn.status()).toBe(200);
    const { access_token } = (await signedIn.json()) as { access_token: string };

    const asStaff = await request.get(`${url}/rest/v1/contact_messages?select=id&limit=5`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${access_token}` },
    });
    expect(await asStaff.json()).toEqual([]);
    const asService = await request.get(`${url}/rest/v1/contact_messages?select=id&limit=5`, {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
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

  test("failures slow an address down, never lock it, and only one attempt runs at a time", async ({ page, context }) => {
    // About 30 seconds of deliberate waiting: the delays are the subject.
    test.setTimeout(90_000);
    // No delay and no attempt in progress to begin with: the last run's
    // teardown cleared this address.
    await page.goto("/staff/sign-in");
    await enterPassword(page, DELAYED);
    await expect(page).toHaveURL(/\/staff\/sign-in\/set-up$/);
    await startOver(page);

    // Four failures: the first three free, the fourth after one second.
    for (let n = 0; n < 4; n++) await expectRefused(page, DELAYED, `wrong-${n}`);

    // The right password still gets in, after the two seconds four failures
    // earn. A password step takes at least 1.5 seconds anyway, so the bound
    // is the delay, not the floor.
    let started = Date.now();
    await enterPassword(page, DELAYED);
    await expect(page).toHaveURL(/\/staff\/sign-in\/set-up$/, { timeout: 15_000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(2_000);
    await startOver(page);

    // A fifth failure: the next attempt waits four seconds. While it waits,
    // a second attempt for the same address, even with the right password,
    // is refused at once, untried.
    await expectRefused(page, DELAYED, "wrong-4");
    const other = await context.newPage();
    await other.goto("/staff/sign-in");
    await enterPassword(page, DELAYED, "wrong-5");
    await page.waitForTimeout(500);
    started = Date.now();
    await expectRefused(other, DELAYED);
    expect(Date.now() - started).toBeLessThan(4_000);
    await expect(page.locator('main form button[type="submit"]')).toHaveText(staffSignIn.submit.label, { timeout: 15_000 });
    await expect(page.getByRole("status")).toHaveText(staffSignIn.failed);

    // Six failures now: eight seconds, and the right password still works.
    started = Date.now();
    await enterPassword(other, DELAYED);
    await expect(other).toHaveURL(/\/staff\/sign-in\/set-up$/, { timeout: 20_000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(8_000);
    await startOver(other);
    await other.close();
  });
});
