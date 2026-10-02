import { expect, test } from "@playwright/test";

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
  "/login", "/register", "/forgot-password",
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
