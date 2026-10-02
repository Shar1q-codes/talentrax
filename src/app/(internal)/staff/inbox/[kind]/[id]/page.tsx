import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { SubmissionView } from "@/features/inbox";
import { getSubmission } from "@/features/inbox/server";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { inboxDetail, inboxKinds, inboxMeta, STAFF_INBOX_PATH, type InboxKind } from "@/content/inbox";
import { buildMetadata } from "@/lib/metadata";

/**
 * One submission. A 404 when it does not exist or RLS hides it: the same
 * answer, so a staff member cannot learn that a row they may not see exists.
 */
export const metadata: Metadata = buildMetadata({
  title: inboxMeta.detail.title,
  description: inboxMeta.detail.description,
  path: STAFF_INBOX_PATH,
  noIndex: true,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getStaffAccess();
  if (access.state !== "signed_in") redirect(staffPathFor(access));

  const { kind, id } = await params;
  const form = inboxKinds.find((k) => k.id === kind);
  if (!form || !UUID.test(id)) notFound();

  const submission = await getSubmission(kind as InboxKind, id);
  if (!submission) notFound();

  const query = await searchParams;
  const flash = query.saved === "1" ? "saved" : query.notsaved === "1" ? "notsaved" : null;
  const name = String(submission.fields.full_name ?? submission.fields.contact_name ?? "");

  return (
    <>
      <PageHeader eyebrow={`${inboxDetail.eyebrow}: ${form.singular}`} heading={name || form.singular} />
      <Container>
        <div className="flex max-w-4xl flex-col gap-10 py-14 sm:py-16 lg:py-20">
          <SubmissionView submission={submission} flash={flash} />
          <div>
            <ButtonLink href={STAFF_INBOX_PATH} variant="secondary">
              {inboxDetail.backLabel}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
