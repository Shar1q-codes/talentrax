/**
 * Unit tests for the resume byte check.
 *
 * It is the only thing between a file named cv.pdf and a staff member's
 * machine that looks at what the file actually is, and it fails silently
 * either way: too strict and real resumes are thrown away, too loose and
 * anything with the right name is kept.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkResume, declaredType, RESUME_TYPES } from "./resume-check.ts";

const text = (s: string) => new TextEncoder().encode(s);
const pdf = text("%PDF-1.7\n%âã\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const doc = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
const docx = new Uint8Array([...[0x50, 0x4b, 0x03, 0x04], ...text("....[Content_Types].xml....word/document.xml....")]);
const plainZip = new Uint8Array([...[0x50, 0x4b, 0x03, 0x04], ...text("....photos/beach.jpg....")]);

const as = (bytes: Uint8Array, mimeType: string) => ({ mimeType, sizeBytes: bytes.length });

describe("checkResume", () => {
  it("keeps a real PDF, DOC and DOCX", () => {
    assert.equal(checkResume(pdf, RESUME_TYPES.pdf, as(pdf, RESUME_TYPES.pdf)), null);
    assert.equal(checkResume(doc, RESUME_TYPES.doc, as(doc, RESUME_TYPES.doc)), null);
    assert.equal(checkResume(docx, RESUME_TYPES.docx, as(docx, RESUME_TYPES.docx)), null);
  });

  it("rejects bytes that are not what the name says", () => {
    const html = text("<html><script>alert(1)</script></html>");
    assert.equal(checkResume(html, RESUME_TYPES.pdf, as(html, RESUME_TYPES.pdf)), "signature_mismatch");
    assert.equal(checkResume(pdf, RESUME_TYPES.docx, as(pdf, RESUME_TYPES.docx)), "signature_mismatch");
    assert.equal(checkResume(docx, RESUME_TYPES.doc, as(docx, RESUME_TYPES.doc)), "signature_mismatch");
  });

  it("rejects a zip that is not a Word document", () => {
    assert.equal(checkResume(plainZip, RESUME_TYPES.docx, as(plainZip, RESUME_TYPES.docx)), "signature_mismatch");
  });

  it("rejects a size or stored type other than declared", () => {
    assert.equal(checkResume(pdf, RESUME_TYPES.pdf, { mimeType: RESUME_TYPES.pdf, sizeBytes: pdf.length + 1 }), "size_mismatch");
    assert.equal(checkResume(pdf, "text/html", as(pdf, RESUME_TYPES.pdf)), "type_mismatch");
  });

  it("reads a stored type with parameters", () => {
    assert.equal(checkResume(pdf, `${RESUME_TYPES.pdf}; charset=binary`, as(pdf, RESUME_TYPES.pdf)), null);
  });

  it("rejects an empty file", () => {
    const empty = new Uint8Array();
    assert.equal(checkResume(empty, RESUME_TYPES.pdf, as(empty, RESUME_TYPES.pdf)), "signature_mismatch");
  });
});

describe("declaredType", () => {
  it("maps the three extensions, whatever their case, and nothing else", () => {
    assert.equal(declaredType("CV.PDF"), RESUME_TYPES.pdf);
    assert.equal(declaredType("cv.doc"), RESUME_TYPES.doc);
    assert.equal(declaredType("cv.final.docx"), RESUME_TYPES.docx);
    assert.equal(declaredType("cv.png"), null);
    assert.equal(declaredType("cv"), null);
    assert.equal(declaredType("pdf"), null);
  });
});
