import { defineConfig, devices } from "@playwright/test";

/**
 * The browser regression suite: `npm run test:browser`.
 *
 * It runs against a PRODUCTION build - the script builds first, and the web
 * server below is `next start`, never `next dev`. Several of the behaviours
 * it guards (the interception proxy, scroll restoration, hydration timing)
 * differ between the two, and the browser pass that found them ran against
 * a production build.
 *
 * Two projects:
 *
 *   headless  everything not tagged @headed. Safe for CI. Includes the
 *             @cdp tests: zoom and touch are driven through the Chrome
 *             DevTools Protocol, which works headless but only in Chromium.
 *   headed    tests tagged @headed. They need a visible browser window,
 *             because only a headed Chromium has classic scrollbars that
 *             take layout width; the headless shell's overlay scrollbars
 *             take none, so the case cannot happen there. Under CI=1 they
 *             are skipped - visibly, in the report - not dropped.
 *
 * See tests/browser/README.md for what each spec covers.
 */
const PORT = 3210;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "headless", grepInvert: /@headed/, use: { headless: true } },
    { name: "headed", grep: /@headed/, use: { headless: false } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  outputDir: "test-results/browser",
});
