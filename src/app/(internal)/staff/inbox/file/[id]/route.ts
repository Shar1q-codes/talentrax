import { notFound, redirect } from "next/navigation";

import { resumeDownloadUrl } from "@/features/inbox/server";

/**
 * A received resume, downloaded. Redirects to a one-minute signed link made
 * with the staff member's own session, which downloads as an attachment and
 * is never rendered in the browser. Anything else is a 404: a refused,
 * unchecked or missing file, a row the caller may not see, or no staff
 * session at all - one answer for all of them.
 *
 * Under /staff, so the session cookie (scoped there) comes with the request.
 * resumeDownloadUrl() checks the session and the file's state, and the
 * storage policy refuses every file not received (migration 18).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = /^[0-9a-f-]{36}$/i.test(id) ? await resumeDownloadUrl(id) : null;
  if (!url) notFound();
  redirect(url);
}
