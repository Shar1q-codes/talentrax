import { expect, test, type Page } from "@playwright/test";
import { articleDetail } from "@/content/insights";
import { focusedHref } from "./helpers";

/**
 * The /insights article modal: an intercepting route, opened only from the
 * index. Defects 1, 2 and 4 of the first browser pass are pinned here.
 */

const indexCards = (page: Page) => page.locator('main a[href^="/insights/"]');

async function pageFacts(page: Page) {
  return page.evaluate(() => ({
    path: location.pathname,
    h1: document.querySelectorAll("h1").length,
    dialogs: document.querySelectorAll("dialog").length,
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
  }));
}

test.describe("defect 1: related reading on a full article", () => {
  test("is an ordinary navigation to a full page, not the modal", async ({ page, browser }) => {
    await page.goto("/insights/healthcare-staffing-models", { waitUntil: "networkidle" });
    const related = page
      .locator("section", { has: page.getByRole("heading", { name: articleDetail.relatedHeading }) })
      .locator('a[href^="/insights/"]')
      .first();
    const href = (await related.getAttribute("href"))!;

    // What a direct visit to that article looks like: the reference.
    const direct = await browser.newPage();
    await direct.goto(href, { waitUntil: "networkidle" });
    const expected = await pageFacts(direct);
    await direct.close();

    await related.click();
    await page.waitForURL(`**${href}`);
    await page.waitForLoadState("networkidle");
    const after = await pageFacts(page);

    expect(after.dialogs, "no dialog in the DOM").toBe(0);
    expect(after.h1, "exactly one <h1>").toBe(1);
    expect(after.title).toBe(expected.title);
    expect(after.canonical).toBe(expected.canonical);
    expect(after.jsonLd, "the full page's structured data").toBe(expected.jsonLd);
  });

  test("with the proxy bypassed, the modal's backstop still gives a full page", async ({ page }) => {
    // What a host that skips src/proxy.ts, or does not honour the header it
    // removes, sends: every soft navigation claims to come from the index.
    // The server then intercepts, and only the modal's own check is left.
    await page.route("**/*", (route) => {
      const headers = route.request().headers();
      if ("next-url" in headers) headers["next-url"] = "/insights";
      return route.continue({ headers });
    });
    const start = "/insights/healthcare-staffing-models";
    await page.goto(start, { waitUntil: "networkidle" });
    const related = page
      .locator("section", { has: page.getByRole("heading", { name: articleDetail.relatedHeading }) })
      .locator('a[href^="/insights/"]')
      .first();
    const href = (await related.getAttribute("href"))!;

    await related.click();
    await page.waitForURL(`**${href}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("dialog")).toHaveCount(0);
    expect((await pageFacts(page)).jsonLd, "the full page, with its structured data").toBeGreaterThan(0);

    // The full load took over the pushed entry: back is the article before.
    await page.goBack();
    await page.waitForURL(`**${start}`);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("a card on the index still opens the modal", async ({ page }) => {
    await page.goto("/insights", { waitUntil: "networkidle" });
    await indexCards(page).nth(2).click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(/^\/insights\/.+/);
  });
});

test.describe("defect 2: closing the modal returns focus to the card", () => {
  const ways = {
    Escape: (page: Page) => page.keyboard.press("Escape"),
    "the Close button": async (page: Page) => {
      await page.getByRole("button", { name: "Close article" }).focus();
      await page.keyboard.press("Enter");
    },
    "the back button": (page: Page) => page.goBack(),
  };

  for (const [way, close] of Object.entries(ways)) {
    test(`by ${way}`, async ({ page }) => {
      await page.goto("/insights", { waitUntil: "networkidle" });
      const opener = indexCards(page).nth(3);
      const openerHref = await opener.getAttribute("href");
      const nextHref = await indexCards(page).nth(4).getAttribute("href");

      // Keyboard all the way: focus the card, open with Enter.
      await opener.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("dialog[open]")).toBeVisible();

      await close(page);
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      await expect(page).toHaveURL(/\/insights$/);

      await expect.poll(() => focusedHref(page)).toBe(openerHref);
      await page.keyboard.press("Tab");
      expect(await focusedHref(page), "the next Tab is the next card, not the footer").toBe(nextHref);
    });
  }
});

test.describe("defect 4: a direct load of an article starts at the article", () => {
  test("reloading with the modal open lands at the top", async ({ page }) => {
    await page.goto("/insights", { waitUntil: "networkidle" });
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
    await indexCards(page).nth(5).click();
    await expect(page.locator("dialog[open]")).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    const facts = await pageFacts(page);
    expect(facts.dialogs).toBe(0);
    expect(facts.h1).toBe(1);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
});

test.describe("the modal, as the browser pass found it working", () => {
  test("the page behind does not scroll, and closing restores the index position", async ({ page }) => {
    await page.goto("/insights", { waitUntil: "networkidle" });
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBeGreaterThan(300);
    const indexY = await page.evaluate(() => Math.round(scrollY));

    await indexCards(page).nth(3).click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.mouse.move(20, 450);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(indexY);

    await page.getByRole("button", { name: "Close article" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(indexY);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("a deep link is the full page with its structured data", async ({ page }) => {
    await page.goto("/insights/healthcare-staffing-models", { waitUntil: "networkidle" });
    const facts = await pageFacts(page);
    expect(facts.dialogs).toBe(0);
    expect(facts.h1).toBe(1);
    expect(facts.jsonLd).toBeGreaterThan(0);
  });
});
