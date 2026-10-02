import { expect, test, type Page } from "@playwright/test";

import { contactFields, contactForm } from "@/content/contact";
import {
  contactFields as briefContactFields,
  requestTalent,
  roleFields,
} from "@/content/request-talent";
import { staffSignIn, staffUnavailable } from "@/content/staff";

/**
 * Site-wide checks from the first browser pass that held, kept so they
 * keep holding: no horizontal scroll at 320px, one <h1>, a new page starts
 * at the top, the skip link lands in <main>, and a failed submit focuses
 * the error summary.
 */

const ROUTES = [
  "/", "/employers", "/employers/services", "/employers/request-talent",
  "/job-seekers", "/job-seekers/upload-resume", "/jobs", "/insights",
  "/insights/healthcare-staffing-models", "/about", "/contact", "/faq",
  "/locations", "/resources", "/accessibility", "/privacy-policy", "/terms",
  "/login", "/register", "/forgot-password", "/staff/sign-in",
];

test.describe("every route at 320px", () => {
  test.use({ viewport: { width: 320, height: 700 }, reducedMotion: "reduce" });
  for (const route of ROUTES) {
    test(`${route}: no horizontal scroll, one <h1>`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }
});

// The chrome lives in the (marketing) layout and in app/not-found.tsx. An
// unmatched URL and a notFound() thrown inside a public route take different
// paths through them; each must end with exactly one of everything. The
// second one drew two of each once.
for (const route of ["/no-such-page", "/jobs/no-such-job", "/insights/no-such-article"]) {
  test(`${route}: a 404 with one header, one <main>, one footer, one <h1>`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}

test("a route change from the bottom of a page starts the next page at the top", async ({ page }) => {
  await page.goto("/employers", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.locator("footer").getByRole("link", { name: "About Us", exact: true }).click();
  await page.waitForURL("**/about");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test("the skip link moves focus into <main>", async ({ page }) => {
  await page.goto("/about", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("MAIN");
});

for (const route of ["/contact", "/employers/request-talent", "/job-seekers/upload-resume"]) {
  test(`${route}: an empty submit focuses the error summary`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.locator('main form button[type="submit"]').click();
    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toBeFocused();
    expect(await page.locator('[aria-invalid="true"]').count()).toBeGreaterThan(0);
  });
}

// This suite's build has no database (scripts/build-without-database.mjs), so
// the forms gate closes every wired form. What the @db suite proves open must
// stay honestly closed here: the notice above the form, "nothing was sent"
// after a valid submit, no request to anywhere but this site, and a privacy
// policy that names no storage.
function requestsOffSite(page: Page, baseURL: string): string[] {
  const seen: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith(baseURL)) seen.push(req.url());
  });
  return seen;
}

test("/contact with no database: says it is not open, and a valid submit sends nothing", async ({ page, baseURL }) => {
  const offSite = requestsOffSite(page, baseURL!);
  await page.goto("/contact", { waitUntil: "networkidle" });
  await expect(page.getByText(contactForm.notOpen.notice)).toBeVisible();

  await page.locator(`#${contactFields.fullName.id}`).fill("Closed Form Person");
  await page.locator(`#${contactFields.email.id}`).fill("closed-form@example.com");
  await page.locator(`#${contactFields.enquiryType.id}-employer`).check();
  await page.locator(`#${contactFields.subject.id}`).fill("Closed");
  await page.locator(`#${contactFields.message.id}`).fill("Nothing should send this.");
  await page.getByRole("button", { name: contactForm.submit.label }).click();

  const outcome = page.getByRole("status");
  await expect(outcome).toHaveText(contactForm.notOpen.afterSubmit);
  await expect(outcome).toBeFocused();
  await expect(page.locator(`#${contactFields.message.id}`)).toHaveValue("Nothing should send this.");
  expect(offSite).toEqual([]);
});

test("/employers/request-talent with no database: says it is not open, and a valid submit sends nothing", async ({ page, baseURL }) => {
  const offSite = requestsOffSite(page, baseURL!);
  await page.goto("/employers/request-talent", { waitUntil: "networkidle" });
  await expect(page.getByText(requestTalent.notOpen.notice)).toBeVisible();

  await page.locator(`#${briefContactFields.fullName.id}`).fill("Closed Form Person");
  await page.locator(`#${briefContactFields.workEmail.id}`).fill("closed-form@example.com");
  await page.locator(`#${briefContactFields.phone.id}`).fill("(202) 555-0143");
  await page.locator(`#${briefContactFields.companyName.id}`).fill("Closed Co");
  await page.locator(`#${roleFields.roleTitle.id}`).fill("Closed role");
  await page.locator(`#${roleFields.service.id}`).selectOption("direct-hire");
  await page.locator(`#${roleFields.specialty.id}`).selectOption("technology:data");
  await page.locator(`#${roleFields.city.id}`).fill("Austin");
  await page.locator(`#${roleFields.state.id}`).selectOption("TX");
  await page.locator(`#${roleFields.workMode.id}-remote`).check();
  await page.getByRole("button", { name: requestTalent.submit.label }).click();

  const outcome = page.getByRole("status");
  await expect(outcome).toHaveText(requestTalent.notOpen.afterSubmit);
  await expect(outcome).toBeFocused();
  await expect(page.locator(`#${roleFields.roleTitle.id}`)).toHaveValue("Closed role");
  expect(offSite).toEqual([]);
});

test("/privacy-policy with no database: names no storage for the forms", async ({ page }) => {
  await page.goto("/privacy-policy", { waitUntil: "networkidle" });
  await expect(page.locator("main")).not.toContainText("Supabase");
});

test("/staff with no database: sign-in says it is not available, and offers no form", async ({ page }) => {
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
  await expect(page.getByText(staffUnavailable)).toBeVisible();
  await expect(page.locator(`#${staffSignIn.fields.password.id}`)).toHaveCount(0);
});
