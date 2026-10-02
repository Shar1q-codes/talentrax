import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { fileStates, flags, inboxDetail, nothingArrivedYet, statusLabels } from "@/content/inbox";
import { uploadResume } from "@/content/upload-resume";
import { expectStackRunning, freshVisitorIp, insertAsVisitor, selectRows, stack, testRun, visitFrom } from "./db";
import { DISGUISED_FILE, fillResumeForm, REAL_PDF } from "./resume-form";
import { clearSignInCount, signInAsStaff } from "./staff-session";

/**
 * @db: the staff inbox (build step 8) against the real local stack.
 *
 * One submission in every state is made first - a contact message, a held
 * one, a talent request, and a resume whose file was received, refused,
 * never arrived, is not yet checked, and never started - then an
 * administrator and a recruiter each look. Every address is on example.com,
 * so every row is a test row: the list is read with test rows included.
 */

const SUPER_ADMIN = { id: "00000000-0000-4000-8000-000000000001", email: "super.admin@example.test" };
const RECRUITER = { id: "00000000-0000-4000-8000-000000000005", email: "recruiter@example.test" };

type Made = {
  contact: string;
  held: string;
  request: string;
  received: string;
  refused: string;
  neverArrived: string;
  notChecked: string;
  none: string;
};
let made: Made;

function asService(request: APIRequestContext) {
  const { url, secretKey } = stack();
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };
  return {
    rpc: (fn: string, data: object) => request.post(`${url}/rest/v1/rpc/${fn}`, { headers, data }),
    patch: (table: string, id: string, data: object) =>
      request.patch(`${url}/rest/v1/${table}?id=eq.${id}`, { headers: { ...headers, Prefer: "return=minimal" }, data }),
  };
}

async function idOf(request: APIRequestContext, table: string, column: string, value: string): Promise<string> {
  const rows = await selectRows<{ id: string }>(request, table, `${column}=eq.${encodeURIComponent(value)}&select=id`);
  expect(rows).toHaveLength(1);
  return rows[0].id;
}

async function resumeThroughForm(page: Page, file: typeof REAL_PDF, marker: string, email: string, expected: string) {
  await visitFrom(page, freshVisitorIp());
  await page.goto("/job-seekers/upload-resume", { waitUntil: "networkidle" });
  await fillResumeForm(page, email, marker, file);
  await page.waitForTimeout(uploadResume.spam.minSubmitSeconds * 1000 + 200);
  await page.getByRole("button", { name: uploadResume.submit.label }).click();
  await expect(page.getByRole("status")).toContainText(expected, { timeout: 15_000 });
}

/** A resume row as the form inserts it, with no upload ever started. */
async function resumeRow(request: APIRequestContext, marker: string, key: string | null) {
  const response = await insertAsVisitor(request, "resume_submissions", {
    full_name: "Db Test Inbox Candidate",
    email: `db-test-${key ? key.slice(0, 8) : marker.slice(-8)}@example.com`,
    consent_store: true,
    message: marker,
    resume_filename: "resume.pdf",
    resume_mime_type: "application/pdf",
    resume_size_bytes: 1000,
    ...(key ? { submission_key: key } : {}),
  }, freshVisitorIp());
  expect(response.status()).toBe(201);
}

function rowFor(page: Page, kind: string, id: string) {
  return page.locator("tr").filter({ has: page.locator(`a[href="/staff/inbox/${kind}/${id}"]`) });
}

test.describe("@db staff inbox", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(async ({ request }) => {
    await expectStackRunning(request);
  });

  test.afterAll(async ({ request }) => {
    for (const account of [SUPER_ADMIN, RECRUITER]) await clearSignInCount(request, account.email);
  });

  test("one submission in every state", async ({ page, request }) => {
    const service = asService(request);
    const run = testRun();
    const m = (what: string) => `${run.marker} ${what}`;

    for (const [what, trap] of [["contact", false], ["held", true]] as const) {
      const response = await insertAsVisitor(request, "contact_messages", {
        full_name: `Db Test Inbox ${what}`, email: `db-test-${what}-${run.id.slice(0, 8)}@example.com`,
        enquiry_type: "employer", subject: "Inbox test", message: m(what), trap_tripped: trap,
      }, freshVisitorIp());
      expect(response.status()).toBe(201);
    }
    const lead = await insertAsVisitor(request, "leads", {
      source: "website_form", contact_name: "Db Test Inbox Lead", contact_email: `db-test-lead-${run.id.slice(0, 8)}@example.com`,
      company_name: "Db Test Co", role_title: "Inbox test role", submitted_details: m("request"),
    }, freshVisitorIp());
    expect(lead.status()).toBe(201);

    await resumeThroughForm(page, REAL_PDF, m("received"), `db-test-r-${run.id.slice(0, 8)}@example.com`, uploadResume.success.title);
    await resumeThroughForm(page, DISGUISED_FILE, m("refused"), `db-test-x-${run.id.slice(0, 8)}@example.com`, uploadResume.outcome.fileRejected);

    await resumeRow(request, m("none"), null);
    const notCheckedKey = crypto.randomUUID();
    await resumeRow(request, m("not checked"), notCheckedKey);
    expect((await service.rpc("claim_resume_upload", { p_submission_key: notCheckedKey })).status()).toBe(200);
    const lapsedKey = crypto.randomUUID();
    await resumeRow(request, m("never arrived"), lapsedKey);
    expect((await service.rpc("claim_resume_upload", { p_submission_key: lapsedKey })).status()).toBe(200);

    made = {
      contact: await idOf(request, "contact_messages", "message", m("contact")),
      held: await idOf(request, "contact_messages", "message", m("held")),
      request: await idOf(request, "leads", "submitted_details", m("request")),
      received: await idOf(request, "resume_submissions", "message", m("received")),
      refused: await idOf(request, "resume_submissions", "message", m("refused")),
      neverArrived: await idOf(request, "resume_submissions", "message", m("never arrived")),
      notChecked: await idOf(request, "resume_submissions", "message", m("not checked")),
      none: await idOf(request, "resume_submissions", "message", m("none")),
    };
    // What the hourly expiry would do to an upload link that lapsed with
    // nothing at it: the trusted backend marks it.
    const lapsed = await service.patch("resume_submissions", made.neverArrived, {
      resume_rejected_at: new Date().toISOString(), resume_rejected_reason: "not_received",
    });
    expect(lapsed.status()).toBe(204);
  });

  test("an administrator sees every form, and each resume's file state before opening it", async ({ page, request }) => {
    await signInAsStaff(page, request, SUPER_ADMIN);
    await page.goto("/staff/inbox?tests=1");

    await expect(rowFor(page, "contact", made.contact)).toHaveCount(1);
    await expect(rowFor(page, "request", made.request)).toHaveCount(1);
    await expect(rowFor(page, "contact", made.held)).toContainText(flags.held);
    await expect(rowFor(page, "contact", made.contact)).toContainText(flags.test);

    const expected: [string, keyof typeof fileStates][] = [
      [made.received, "received"],
      [made.refused, "refused"],
      [made.neverArrived, "never_arrived"],
      [made.notChecked, "not_checked"],
      [made.none, "none"],
    ];
    for (const [id, state] of expected) {
      const cell = rowFor(page, "resume", id).locator("[data-file-state]");
      await expect(cell).toHaveAttribute("data-file-state", state);
      await expect(cell).toHaveText(fileStates[state].label);
    }

    // Test rows are hidden unless asked for.
    await page.goto("/staff/inbox");
    await expect(rowFor(page, "contact", made.contact)).toHaveCount(0);
  });

  test("only a received file is offered, and only it downloads", async ({ page, request }) => {
    await signInAsStaff(page, request, SUPER_ADMIN);

    await page.goto(`/staff/inbox/resume/${made.received}`);
    const link = page.getByRole("link", { name: inboxDetail.download(REAL_PDF.name) });
    await expect(link).toBeVisible();
    const redirect = await page.request.get(`/staff/inbox/file/${made.received}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(307);
    const file = await page.request.get(redirect.headers()["location"]);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-disposition"]).toMatch(/^attachment/);
    expect(Buffer.from(await file.body()).equals(REAL_PDF.buffer)).toBe(true);

    for (const [id, state] of [[made.refused, "refused"], [made.neverArrived, "never_arrived"], [made.none, "none"]] as const) {
      await page.goto(`/staff/inbox/resume/${id}`);
      await expect(page.locator(`[data-file-state="${state}"]`)).toContainText(fileStates[state].label);
      await expect(page.getByRole("link", { name: /^Download/ })).toHaveCount(0);
      expect((await page.request.get(`/staff/inbox/file/${id}`, { maxRedirects: 0 })).status()).toBe(404);
    }
    await expect(page.locator("main")).not.toContainText("signature");

    // Opening an unchecked row checks it: nothing there yet, said plainly.
    await page.goto(`/staff/inbox/resume/${made.notChecked}`);
    await expect(page.locator('[data-file-state="not_checked"]')).toContainText(nothingArrivedYet);
    await expect(page.getByRole("link", { name: /^Download/ })).toHaveCount(0);
  });

  test("status and test flag can be changed, and say so", async ({ page, request }) => {
    await signInAsStaff(page, request, SUPER_ADMIN);
    await page.goto(`/staff/inbox/contact/${made.contact}`);
    await page.getByLabel(inboxDetail.statusLegend).selectOption("in_progress");
    await page.getByRole("button", { name: inboxDetail.saveStatus }).click();
    await expect(page.getByRole("status")).toHaveText(inboxDetail.saved);
    await expect(page.getByLabel(inboxDetail.statusLegend)).toHaveValue("in_progress");

    // "Saved." is already on the page from the status change: wait for the
    // button to flip instead, which only a reload after the change can do.
    await page.getByRole("button", { name: inboxDetail.markReal }).click();
    await expect(page.getByRole("button", { name: inboxDetail.markTest })).toBeVisible();
    const [row] = await selectRows<{ is_test: boolean; status: string }>(request, "contact_messages", `id=eq.${made.contact}&select=is_test,status`);
    expect(row).toEqual({ is_test: false, status: "in_progress" });
    await page.getByRole("button", { name: inboxDetail.markTest }).click();
    await expect(page.getByRole("button", { name: inboxDetail.markReal })).toBeVisible();

    await page.goto("/staff/inbox?tests=1");
    await expect(rowFor(page, "contact", made.contact)).toContainText(statusLabels.in_progress);
  });

  test("a recruiter sees only the resumes routed to them, and nothing else", async ({ page, request }) => {
    const routed = await asService(request).patch("resume_submissions", made.received, { owner_id: RECRUITER.id });
    expect(routed.status()).toBe(204);

    await signInAsStaff(page, request, RECRUITER);
    await page.goto("/staff/inbox?tests=1");
    await expect(rowFor(page, "resume", made.received)).toHaveCount(1);
    for (const [kind, id] of [["contact", made.contact], ["request", made.request], ["resume", made.refused]] as const) {
      await expect(rowFor(page, kind, id)).toHaveCount(0);
      const response = await page.goto(`/staff/inbox/${kind}/${id}`);
      expect(response?.status()).toBe(404);
    }

    // Their own resume: readable and downloadable, as for an administrator.
    await page.goto(`/staff/inbox/resume/${made.received}`);
    await expect(page.getByRole("link", { name: inboxDetail.download(REAL_PDF.name) })).toBeVisible();
    expect((await page.request.get(`/staff/inbox/file/${made.received}`, { maxRedirects: 0 })).status()).toBe(307);
  });
});
