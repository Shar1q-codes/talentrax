import { expect, test } from "@playwright/test";
import { firstVisibleArticle, gotoRail, parkOnCard } from "./helpers";

/**
 * @headed - NOT runnable in headless CI.
 *
 * Defect 3d: the page's classic scrollbar disappearing and reappearing
 * (the mobile drawer locks the page, which removes it) changes the rail's
 * width by the scrollbar's. Only a headed Chromium has scrollbars that take
 * layout width; the headless shell's are overlays that take none, so in
 * headless this test would pass without testing anything. It is skipped
 * under CI=1, and fails rather than passing vacuously if a run somehow
 * has no scrollbar width.
 */
test.describe("defect 3d: the scrollbar coming and going @headed", () => {
  test.skip(!!process.env.CI, "needs a visible browser with classic scrollbars");

  test("keeps the visitor's place", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await gotoRail(page);
    const scrollbar = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
    expect(scrollbar, "this run has a scrollbar that takes width").toBeGreaterThan(0);

    await parkOnCard(page, 3);
    const before = await firstVisibleArticle(page);

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect
      .poll(() => page.evaluate(() => innerWidth - document.documentElement.clientWidth))
      .toBe(0);
    await page.keyboard.press("Escape");
    await expect
      .poll(() => page.evaluate(() => innerWidth - document.documentElement.clientWidth))
      .toBe(scrollbar);
    await page.waitForTimeout(400);

    expect(await firstVisibleArticle(page)).toBe(before);
  });
});
