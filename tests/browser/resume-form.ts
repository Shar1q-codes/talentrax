import type { Page } from "@playwright/test";

import { aboutYouFields, consentFields, workFields } from "@/content/upload-resume";

/**
 * Filling the resume form, for both suites. Field ids come from the content
 * layer, as the form's own do.
 */

export type ResumeFile = { name: string; mimeType: string; buffer: Buffer };

/** A small real PDF: the first bytes are what the server checks. */
export const REAL_PDF: ResumeFile = {
  name: "resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from(
    "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
      "2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
  ),
};

/** Named like a PDF, and is not one. */
export const DISGUISED_FILE: ResumeFile = {
  name: "resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("<html><body>Not a resume.</body></html>\n"),
};

export async function fillResumeForm(page: Page, email: string, message: string, file: ResumeFile) {
  await page.locator(`#${aboutYouFields.fullName.id}`).fill("Db Test Candidate");
  await page.locator(`#${aboutYouFields.email.id}`).fill(email);
  await page.locator(`#${aboutYouFields.phone.id}`).fill("(202) 555-0143");
  await page.locator(`#${aboutYouFields.city.id}`).fill("Austin");
  await page.locator(`#${aboutYouFields.state.id}`).selectOption("TX");
  await page.locator(`#${workFields.specialty.id}`).selectOption("healthcare:nursing");
  await page.locator(`#${workFields.workAuthorization.id}-authorized`).check();
  await page.locator(`#${workFields.engagementTypes.id}-contract`).check();
  await page.locator(`#${workFields.message.id}`).fill(message);
  await page.locator(`#${workFields.resume.id}`).setInputFiles(file);
  await page.locator(`#${consentFields.storeAndContact.id}`).check();
}
