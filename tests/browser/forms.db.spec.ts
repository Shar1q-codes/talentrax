import { expect, test, type Page } from "@playwright/test";

import { contactFields, contactForm } from "@/content/contact";
import {
  contactFields as briefContactFields,
  requestTalent,
  roleFields,
} from "@/content/request-talent";
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
      "What you send through the contact form or the Request Talent form is stored by Supabase, Inc., the company that runs our database.",
    );
  });
});

type LeadRow = {
  submission_key: string | null;
  [column: string]: unknown;
};

test.describe("@db request talent form", () => {
  test.beforeAll(async ({ request }) => {
    await expectStackRunning(request);
  });

  async function fillBrief(page: Page, run: ReturnType<typeof testRun>) {
    await page.locator(`#${briefContactFields.fullName.id}`).fill("Db Test Hiring Manager");
    await page.locator(`#${briefContactFields.workEmail.id}`).fill(run.email);
    await page.locator(`#${briefContactFields.phone.id}`).fill("(202) 555-0143");
    await page.locator(`#${briefContactFields.companyName.id}`).fill("Db Test Company");
    await page.locator(`#${roleFields.roleTitle.id}`).fill("Registered Nurse, ICU");
    await page.locator(`#${roleFields.service.id}`).selectOption("contract");
    await page.locator(`#${roleFields.specialty.id}`).selectOption("healthcare:nursing");
    await page.locator(`#${roleFields.city.id}`).fill("Washington");
    await page.locator(`#${roleFields.state.id}`).selectOption("DC");
    await page.locator(`#${roleFields.workMode.id}-onsite`).check();
    await page.locator(`#${roleFields.positions.id}`).fill("2");
    await page.locator(`#${roleFields.salaryMin.id}`).fill("55");
    await page.locator(`#${roleFields.salaryMax.id}`).fill("70");
    await page.locator(`#${roleFields.salaryUnit.id}`).selectOption("hour");
    await page.locator(`#${roleFields.requirements.id}`).fill(run.marker);
  }

  const send = (page: Page) => page.getByRole("button", { name: requestTalent.submit.label }).click();
  const rowsFor = (request: Parameters<typeof selectRows>[0], marker: string) =>
    selectRows<LeadRow>(request, "leads", `submitted_details=eq.${encodeURIComponent(marker)}&select=*`);

  test("the page says nothing about being closed", async ({ page }) => {
    await page.goto("/employers/request-talent", { waitUntil: "networkidle" });
    await expect(page.getByText(requestTalent.notOpen.notice)).toHaveCount(0);
  });

  test("success: the brief is stored once as a new website lead, and the visitor is told", async ({ page, request }) => {
    const run = testRun();
    await visitFrom(page, freshVisitorIp());
    await page.goto("/employers/request-talent", { waitUntil: "networkidle" });
    await fillBrief(page, run);
    await waitOutSpamDelay(page);
    await send(page);

    const confirmation = page.getByRole("status").filter({ hasText: requestTalent.success.title });
    await expect(confirmation).toBeFocused();
    await expect(confirmation).toContainText(requestTalent.success.body);

    const rows = await rowsFor(request, run.marker);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "website_form",
      contact_name: "Db Test Hiring Manager",
      contact_email: run.email,
      contact_phone: "(202) 555-0143",
      contact_title: null,
      company_name: "Db Test Company",
      role_title: "Registered Nurse, ICU",
      requested_service: "contract",
      desk: "healthcare",
      specialty: "nursing",
      city: "Washington",
      state: "DC",
      work_mode: "onsite",
      positions: 2,
      target_start: null,
      salary_min: 55,
      salary_max: 70,
      salary_unit: "hour",
      status: "new",
      owner_id: null,
      is_test: true,
      held_at: null,
    });
    expect(rows[0].submission_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("validation error: nothing leaves the browser, and the summary takes focus", async ({ page, request }) => {
    const run = testRun();
    const sent = recordStackRequests(page);
    await page.goto("/employers/request-talent", { waitUntil: "networkidle" });
    await fillBrief(page, run);
    await page.locator(`#${roleFields.salaryMax.id}`).fill("40");
    await waitOutSpamDelay(page);
    await send(page);

    const summary = page.locator('main [role="alert"]');
    await expect(summary).toBeFocused();
    await expect(summary).toContainText(roleFields.salaryMax.errorFormat);
    await expect(page.locator(`#${roleFields.salaryMax.id}`)).toHaveAttribute("aria-invalid", "true");
    expect(sent).toEqual([]);
    expect(await rowsFor(request, run.marker)).toHaveLength(0);
  });

  test("429: the wait is shown, what was typed is kept, and nothing is stored", async ({ page, request }) => {
    const ip = freshVisitorIp();
    const { id } = testRun();
    for (let n = 1; n <= 20; n++) {
      const response = await insertAsVisitor(request, "leads", {
        source: "website_form",
        contact_name: "Db Test Filler",
        contact_email: `db-test-filler-${n}@example.com`,
        company_name: "Db Test Filler Co",
        submitted_details: `DB-TEST filler ${id} ${n}`,
      }, ip);
      expect(response.status()).toBe(201);
    }

    const run = testRun();
    await visitFrom(page, ip);
    await page.goto("/employers/request-talent", { waitUntil: "networkidle" });
    await fillBrief(page, run);
    await waitOutSpamDelay(page);
    const answer = page.waitForResponse((r) => r.url().startsWith(`${stack().url}/rest/v1/leads`));
    await send(page);
    expect((await answer).status()).toBe(429);

    const outcome = page.getByRole("status");
    await expect(outcome).toBeFocused();
    await expect(outcome).toHaveText(requestTalent.outcome.rateLimited(3600));
    await expect(page.locator(`#${roleFields.requirements.id}`)).toHaveValue(run.marker);
    expect(await rowsFor(request, run.marker)).toHaveLength(0);
  });

  test("a retry after a lost response is stored once, not twice", async ({ page, request }) => {
    const run = testRun();
    await visitFrom(page, freshVisitorIp());
    let dropped = false;
    await page.route(`${stack().url}/rest/v1/leads*`, async (route) => {
      if (dropped) return route.fallback();
      dropped = true;
      await route.fetch({ headers: { ...route.request().headers(), "cf-connecting-ip": freshVisitorIp() } });
      await route.abort("failed");
    });
    await page.goto("/employers/request-talent", { waitUntil: "networkidle" });
    await fillBrief(page, run);
    await waitOutSpamDelay(page);
    await send(page);

    const outcome = page.getByRole("status");
    await expect(outcome).toHaveText(requestTalent.outcome.failed);
    await expect(outcome).toBeFocused();
    expect(await rowsFor(request, run.marker)).toHaveLength(1);

    await send(page);
    await expect(page.getByRole("status").filter({ hasText: requestTalent.success.title })).toBeFocused();
    expect(await rowsFor(request, run.marker)).toHaveLength(1);
  });
});
