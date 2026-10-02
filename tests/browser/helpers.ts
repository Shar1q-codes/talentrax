import { expect, type Page } from "@playwright/test";
import { latestArticles } from "@/content/home";

/** The home page's latest-articles rail. */
export const RAIL = `[role="region"][aria-label="${latestArticles.railLabel}"]`;
/** The real (not copy) cards' links. */
export const REAL_CARD_LINKS = `${RAIL} li:not([data-rail-copy]) a`;

export const { pauseLabel, playLabel } = latestArticles.controls;

/** Open the home page with the rail on screen and looping. */
export async function gotoRail(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(RAIL).scrollIntoViewIfNeeded();
  await expect(page.locator(RAIL)).toHaveAttribute("data-infinite", /.*/);
  // Nothing hovering it: the pointer starts at the top-left corner.
  await page.mouse.move(2, 2);
}

/** Press pause, if it is not already paused. */
export async function pauseRail(page: Page) {
  const pause = page.getByRole("button", { name: pauseLabel });
  if (await pause.count()) await pause.click();
  await expect(page.getByRole("button", { name: playLabel })).toBeVisible();
  await page.mouse.move(2, 2);
}

/** Bring real card `index` to the rail's left edge, paused. */
export async function parkOnCard(page: Page, index: number) {
  await pauseRail(page);
  await page.evaluate(
    ([sel, i]) => {
      const rail = document.querySelector(sel as string)!;
      const card = rail.querySelectorAll("li:not([data-rail-copy])")[i as number];
      rail.scrollLeft +=
        card.getBoundingClientRect().left - rail.getBoundingClientRect().left;
    },
    [RAIL, index] as const,
  );
  await page.waitForTimeout(300);
}

/**
 * Which article is at the rail's left edge, by href. The copies carry the
 * same hrefs as the real set, so this names the article whichever set is
 * showing it.
 */
export function firstVisibleArticle(page: Page) {
  return page.evaluate((sel) => {
    const rail = document.querySelector(sel)!;
    const left = rail.getBoundingClientRect().left;
    let best: { d: number; href: string | null } | null = null;
    for (const li of rail.querySelectorAll("li")) {
      const box = li.getBoundingClientRect();
      if (!box.width) continue;
      const d = Math.abs(box.left - left);
      if (!best || d < best.d) best = { d, href: li.querySelector("a")!.getAttribute("href") };
    }
    return best?.href ?? null;
  }, RAIL);
}

export const railScrollLeft = (page: Page) =>
  page.evaluate((sel) => document.querySelector(sel)!.scrollLeft, RAIL);

/** The focused element's href, or its tag name if it has none. */
export const focusedHref = (page: Page) =>
  page.evaluate(
    () => document.activeElement?.getAttribute("href") ?? document.activeElement?.tagName ?? null,
  );
