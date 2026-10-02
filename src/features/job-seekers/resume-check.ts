/**
 * What arrived, against what the form declared: the upload endpoint's check
 * on a resume before it is marked received (migration 17).
 *
 * The bucket enforces the size cap and the allowed types at upload, but the
 * type it enforces is only the Content-Type the browser claimed. This reads
 * the bytes. A file is kept only if:
 *   - its size is exactly the size the form declared;
 *   - its stored type is exactly the type the form declared;
 *   - its first bytes are what that type's files start with, and a DOCX
 *     really is a Word document inside its zip, not any zip.
 *
 * It says nothing about whether a real PDF or Word file is safe to open:
 * there is no malware scanning (CLIENT-CONFIRM.md item 26). Staff download
 * it as an attachment, never rendered inline.
 */

export const RESUME_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export type RejectedReason = "size_mismatch" | "type_mismatch" | "signature_mismatch";

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // Word 97-2003
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
const WORD_PART = new TextEncoder().encode("word/document.xml");

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return bytes.length >= prefix.length && prefix.every((byte, i) => bytes[i] === byte);
}

function contains(bytes: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function signatureMatches(bytes: Uint8Array, mime: string): boolean {
  switch (mime) {
    case RESUME_TYPES.pdf:
      return startsWith(bytes, PDF);
    case RESUME_TYPES.doc:
      return startsWith(bytes, OLE);
    case RESUME_TYPES.docx:
      return startsWith(bytes, ZIP) && contains(bytes, WORD_PART);
    default:
      return false;
  }
}

/** Null: keep it. Otherwise, why not. */
export function checkResume(
  bytes: Uint8Array,
  storedType: string,
  declared: { mimeType: string; sizeBytes: number },
): RejectedReason | null {
  if (bytes.length !== declared.sizeBytes) return "size_mismatch";
  if (storedType.split(";")[0].trim() !== declared.mimeType) return "type_mismatch";
  if (!signatureMatches(bytes, declared.mimeType)) return "signature_mismatch";
  return null;
}

/** The type a filename's extension stands for, as the form declares it. */
export function declaredType(filename: string): string | null {
  const extension = filename.toLowerCase().match(/\.(pdf|docx?|)$/)?.[1];
  return extension && extension in RESUME_TYPES ? RESUME_TYPES[extension as keyof typeof RESUME_TYPES] : null;
}
