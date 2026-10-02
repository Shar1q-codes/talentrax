import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStaffAccess, staffPathFor } from "@/features/auth/server";
import { InboxFilter, InboxTable } from "@/features/inbox";
import { listInbox } from "@/features/inbox/server";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { inboxKinds, inboxList, inboxMeta, STAFF_INBOX_PATH, type InboxKind } from "@/content/inbox";
import { STAFF_HOME_PATH } from "@/content/staff";
import { buildMetadata } from "@/lib/metadata";

/**
 * The inbox: what has arrived through the three forms, newest first.
 * Staff past both sign-in steps only; RLS decides which rows each sees.
 * ?kind=contact|request|resume narrows it; ?tests=1 includes test rows.
 */
export const metadata: Metadata = buildMetadata({
  title: inboxMeta.list.title,
  description: inboxMeta.list.description,
  path: STAFF_INBOX_PATH,
  noIndex: true,
});

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await getStaffAccess();
  if (access.state !== "signed_in") redirect(staffPathFor(access));

  const params = await searchParams;
  const kind = inboxKinds.some((k) => k.id === params.kind) ? (params.kind as InboxKind) : null;
  const includeTests = params.tests === "1";
  const { items, truncated } = await listInbox({ kind, includeTests });

  return (
    <>
      <PageHeader eyebrow={inboxList.eyebrow} heading={inboxList.heading} intro={inboxList.intro} />
      <Container>
        <div className="flex flex-col gap-8 py-14 sm:py-16 lg:py-20">
          <InboxFilter kind={kind} includeTests={includeTests} />
          {items.length === 0 ? (
            <p className="max-w-3xl text-base text-ink-muted">{inboxList.empty}</p>
          ) : (
            <InboxTable items={items} />
          )}
          {truncated ? <p className="text-sm text-ink-muted">{inboxList.truncated(100)}</p> : null}
          <div>
            <ButtonLink href={STAFF_HOME_PATH} variant="secondary">
              {inboxList.backLabel}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
