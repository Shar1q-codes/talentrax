import { expect, test, type Page } from "@playwright/test";

import { contactFields, contactForm } from "@/content/contact";
import {
  expectStackRunning,
  freshVisitorIp,
  insertAsVisitor,
  recordStackRequests,
  selectRows,
  stack,
  testRun,
  visitFrom,
} from "./db";

/**
 * @db: the wired public forms against the real local stack.
 *
 * `npm run test:browser:db` (playwright.db.config.ts). Never part of
 * `npm run test:browser`, whose build has no database; the closed state of
 * each form is tested there, in site.spec.ts.
 *
 * Each form is driven through every path a visitor can reach - stored,
 * refused by validation, refused with a 429, and a retry after a lost
 * response - and what the database holds afterwards is read back as the
 * service role. Addresses are on example.com, so every row is is_test.
 */

/** The forms refuse a submit within this long of the page opening. */
async function waitOutSpamDelay(page: Page) {
  await page.waitForTimeout(contactForm.spam.minSubmitSeconds * 1000 + 200);
}

type ContactRow = {
  email: string;
  enquiry_type: string;
  subject: string;
  phone: string | null;
  submission_key: string | null;
  is_test: boolean;
  held_at: string | null;
  status: string;
};

test.describe("@db contact form", () => {
  test.beforeAll(async ({ request }) => {
    await expectStackRunning(request);
  });

  async function fillContact(page: Page, run: ReturnType<typeof testRun>) {
    await page.locator(`#${contactFields.fullName.id}`).fill("Db Test Person");
    await page.locator(`#${contactFields.email.id}`).fill(run.email);
    await page.locator(`#${contactFields.enquiryType.id}-employer`).check();
    await page.locator(`#${contactFields.subject.id}`).fill("Browser test");
    await page.locator(`#${contactFields.message.id}`).fill(run.marker);
  }

  const send = (page: Page) => page.getByRole("button", { name: contactForm.submit.label }).click();
  const rowsFor = (request: Parameters<typeof selectRows>[0], marker: string) =>
    selectRows<ContactRow>(request, "contact_messages", `message=eq.${encodeURIComponent(marker)}&select=*`);

  test("the page says nothing about being closed", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });
    await expect(page.getByText(contactForm.notOpen.notice)).toHaveCount(0);
  });

  test("success: the message is stored once, and the visitor is told it was received", async ({ page, request }) => {
    const run = testRun();
    await visitFrom(page, freshVisitorIp());
    await page.goto("/contact", { waitUntil: "networkidle" });
    await fillContact(page, run);
    await waitOutSpamDelay(page);
    await send(page);

    const confirmation = page.getByRole("status").filter({ hasText: contactForm.success.title });
    await expect(confirmation).toBeFocused();
    await expect(confirmation).toContainText(contactForm.success.body);

    const rows = await rowsFor(request, run.marker);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: run.email,
      enquiry_type: "employer",
      phone: null,
      status: "new",
      is_test: true,
      held_at: null,
    });
    expect(rows[0].submission_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("validation error: nothing leaves the browser, and the summary takes focus", async ({ page, request }) => {
    const run = testRun();
    const sent = recordStackRequests(page);
    await page.goto("/contact", { waitUntil: "networkidle" });
    await fillContact(page, run);
    await page.locator(`#${contactFields.email.id}`).fill("not-an-email");
    await waitOutSpamDelay(page);
    await send(page);

    const summary = page.locator('main [role="alert"]');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText(contactFields.email.errorFormat);
    await expect(page.locator(`#${contactFields.email.id}`)).toHaveAttribute("aria-invalid", "true");
    expect(sent).toEqual([]);
    expect(await rowsFor(request, run.marker)).toHaveLength(0);
  });

  test("429: the wait is shown, what was typed is kept, and nothing is stored", async ({ page, request }) => {
    const ip = freshVisitorIp();
    const { id } = testRun();
    // Twenty distinct messages from this address fill its hourly allowance.
    for (let n = 1; n <= 20; n++) {
      const response = await insertAsVisitor(request, "contact_messages", {
        full_name: "Db Test Filler",
        email: `db-test-filler-${n}@example.com`,
        enquiry_type: "job-seeker",
        subject: "Filler",
        message: `DB-TEST filler ${id} ${n}`,
      }, ip);
      expect(response.status()).toBe(201);
    }

    const run = testRun();
    await visitFrom(page, ip);
    await page.goto("/contact", { waitUntil: "networkidle" });
    await fillContact(page, run);
    await waitOutSpamDelay(page);
    const answer = page.waitForResponse((r) => r.url().startsWith(`${stack().url}/rest/v1/contact_messages`));
    await send(page);
    expect((await answer).status()).toBe(429);

    const outcome = page.getByRole("status");
    await expect(outcome).toBeFocused();
    // Retry-After is a whole hour less the moments since the first filler.
    await expect(outcome).toHaveText(contactForm.outcome.rateLimited(3600));
    await expect(page.locator(`#${contactFields.message.id}`)).toHaveValue(run.marker);
    expect(await rowsFor(request, run.marker)).toHaveLength(0);
  });

  test("a retry after a lost response is stored once, not twice", async ({ page, request }) => {
    const run = testRun();
    await visitFrom(page, freshVisitorIp());
    // The first send reaches the database, and its answer never reaches the
    // browser: a connection dropped after the press. Later sends go through.
    let dropped = false;
    await page.route(`${stack().url}/rest/v1/contact_messages*`, async (route) => {
      if (dropped) return route.fallback();
      dropped = true;
      await route.fetch({ headers: { ...route.request().headers(), "cf-connecting-ip": freshVisitorIp() } });
      await route.abort("failed");
    });
    await page.goto("/contact", { waitUntil: "networkidle" });
    await fillContact(page, run);
    await waitOutSpamDelay(page);
    await send(page);

    const outcome = page.getByRole("status");
    await expect(outcome).toHaveText(contactForm.outcome.failed);
    await expect(outcome).toBeFocused();
    expect(await rowsFor(request, run.marker)).toHaveLength(1);

    await send(page);
    await expect(page.getByRole("status").filter({ hasText: contactForm.success.title })).toBeFocused();
    expect(await rowsFor(request, run.marker)).toHaveLength(1);
  });

  test("the privacy policy says where form submissions are stored", async ({ page }) => {
    await page.goto("/privacy-policy", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(
      "What you send through the contact form is stored by Supabase, Inc., the company that runs our database.",
    );
  });
});
