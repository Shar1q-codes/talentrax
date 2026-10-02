import { expect, test, type CDPSession } from "@playwright/test";
import {
  RAIL,
  REAL_CARD_LINKS,
  firstVisibleArticle,
  gotoRail,
  parkOnCard,
  pauseLabel,
  railScrollLeft,
} from "./helpers";

/**
 * The home page's latest-articles rail (components/ui/ScrollRail.tsx).
 * Defects 3, 5 and 6 of the first browser pass are pinned here. The case
 * that needs real scrollbars is in rail-scrollbar.spec.ts (@headed).
 *
 * @cdp tests drive zoom and touch through the Chrome DevTools Protocol:
 * headless-safe, Chromium only.
 */

test.describe("defect 3: a width change keeps the visitor's place", () => {
  test("resizing below 1280px", async ({ page }) => {
    await gotoRail(page);
    await parkOnCard(page, 3);
    const before = await firstVisibleArticle(page);
    for (const width of [1100, 900, 1279, 700]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      expect(await firstVisibleArticle(page), `at ${width}px`).toBe(before);
    }
  });

  test("rotating a phone, and back", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    await gotoRail(page);
    await parkOnCard(page, 4);
    const before = await firstVisibleArticle(page);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    expect(await firstVisibleArticle(page), "landscape").toBe(before);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    expect(await firstVisibleArticle(page), "portrait again").toBe(before);
    await context.close();
  });

  test("zooming to 150% @cdp", async ({ page, context }) => {
    // Browser zoom itself cannot be driven by Playwright. Its effect on
    // layout can: a 1200px window at 150% lays out 800 CSS px at a device
    // scale factor of 1.5, which is what this emulates.
    await page.setViewportSize({ width: 1200, height: 900 });
    await gotoRail(page);
    await parkOnCard(page, 2);
    const before = await firstVisibleArticle(page);

    const cdp: CDPSession = await context.newCDPSession(page);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 800,
      height: 600,
      deviceScaleFactor: 1.5,
      mobile: false,
    });
    await page.waitForTimeout(400);
    expect(await firstVisibleArticle(page)).toBe(before);
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    await page.waitForTimeout(400);
    expect(await firstVisibleArticle(page), "back to 100%").toBe(before);
  });
});

test.describe("defect 5: a mouse press holds the pause until release", () => {
  test("the card links are not draggable", async ({ page }) => {
    await gotoRail(page);
    const links = page.locator(`${RAIL} a`);
    for (const value of await links.evaluateAll((all) => all.map((a) => a.getAttribute("draggable")))) {
      expect(value).toBe("false");
    }
  });

  test("pressed on a card and dragged off the rail, the drift stays stopped", async ({ page }) => {
    await gotoRail(page);
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      (window as unknown as { drags: number }).drags = 0;
      document.addEventListener("dragstart", () => (window as unknown as { drags: number }).drags++, true);
    });
    const box = (await page.locator(REAL_CARD_LINKS).nth(1).boundingBox())!;

    // Drifting before the press: it is not paused by something else.
    const s0 = await railScrollLeft(page);
    await page.waitForTimeout(600);
    expect(await railScrollLeft(page)).toBeGreaterThan(s0);

    await page.mouse.move(box.x + 40, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 60, { steps: 10 });
    await page.mouse.move(box.x + 400, box.y + 400, { steps: 10 }); // off the control
    const held = await railScrollLeft(page);
    await page.waitForTimeout(1200);
    expect(Math.abs((await railScrollLeft(page)) - held), "still while held").toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => (window as unknown as { drags: number }).drags)).toBe(0);

    await page.mouse.up();
    await page.mouse.move(2, 2);
    const released = await railScrollLeft(page);
    await page.waitForTimeout(1000);
    expect(await railScrollLeft(page), "resumes after release").toBeGreaterThan(released);
  });

  test("pressed and held on a card, the drift stays stopped", async ({ page }) => {
    await gotoRail(page);
    const box = (await page.locator(REAL_CARD_LINKS).nth(1).boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 30, { steps: 8 });
    const held = await railScrollLeft(page);
    await page.waitForTimeout(1200);
    expect(Math.abs((await railScrollLeft(page)) - held)).toBeLessThanOrEqual(1);
    // Release off the card, or the press is a click and navigates.
    await page.mouse.move(2, 2, { steps: 5 });
    await page.mouse.up();
  });

  test("text selection elsewhere on the page still works", async ({ page }) => {
    await gotoRail(page);
    const heading = page.locator("main h2:visible").first();
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + 1, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    expect((await page.evaluate(() => getSelection()?.toString() ?? "")).length).toBeGreaterThan(0);
  });

  test("a touch drag still scrolls the rail @cdp", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    await gotoRail(page);
    const cdp = await context.newCDPSession(page);
    const box = (await page.locator(RAIL).boundingBox())!;
    const y = box.y + box.height / 2;
    const before = await railScrollLeft(page);

    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y }] });
    for (let x = 300; x >= 100; x -= 20) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(500);
    expect(await railScrollLeft(page)).toBeGreaterThan(before + 100);
    await context.close();
  });
});

test.describe("defect 6: the focus ring outlines the whole card", () => {
  test("drawn on the covering box, the card's size, not clipped by the rail", async ({ page }) => {
    await gotoRail(page);
    await parkOnCard(page, 1);
    const card = page.locator(REAL_CARD_LINKS).nth(1);
    // Keyboard focus, so :focus-visible matches.
    await card.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(card).toBeFocused();

    const ring = await card.evaluate((a, railSel) => {
      const own = getComputedStyle(a);
      const after = getComputedStyle(a, "::after");
      const li = a.closest("li")!.getBoundingClientRect();
      const rail = document.querySelector(railSel)!.getBoundingClientRect();
      const width = parseFloat(after.outlineWidth);
      const offset = parseFloat(after.outlineOffset);
      return {
        focusVisible: a.matches(":focus-visible"),
        onText: own.outlineStyle !== "none" && parseFloat(own.outlineWidth) > 0,
        onCard: after.outlineStyle === "solid" && width > 0,
        coversCard: after.position === "absolute" && after.inset === "0px",
        // The ring's outer edge, relative to the card's edge.
        reach: offset + width,
        cardTop: li.top,
        cardBottom: li.bottom,
        railTop: rail.top,
        railBottom: rail.bottom,
      };
    }, RAIL);

    expect(ring.focusVisible).toBe(true);
    expect(ring.onText, "no ring around the title text").toBe(false);
    expect(ring.onCard, "a ring on the covering ::after").toBe(true);
    expect(ring.coversCard).toBe(true);
    // Inside the rail's clip box top and bottom.
    expect(ring.cardTop - ring.reach).toBeGreaterThanOrEqual(ring.railTop - 0.5);
    expect(ring.cardBottom + ring.reach).toBeLessThanOrEqual(ring.railBottom + 0.5);
  });
});

test.describe("the rail, as the browser pass found it working", () => {
  test("the pause button stays paused", async ({ page }) => {
    await gotoRail(page);
    await page.getByRole("button", { name: pauseLabel }).click();
    await page.mouse.move(2, 2);
    const s = await railScrollLeft(page);
    await page.waitForTimeout(1500);
    expect(await railScrollLeft(page)).toBe(s);
  });

  test("under reduced motion it never drifts and the pause button is hidden", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await gotoRail(page);
    const s = await railScrollLeft(page);
    await page.waitForTimeout(1200);
    expect(await railScrollLeft(page)).toBe(s);
    await expect(page.getByRole("button", { name: pauseLabel })).toHaveCount(0);
    await context.close();
  });

  test("Tab reaches the six real cards and no copy", async ({ page }) => {
    await gotoRail(page);
    const tabbable = await page.locator(`${RAIL} a:not([tabindex="-1"])`).count();
    expect(tabbable).toBe(6);
  });
});
