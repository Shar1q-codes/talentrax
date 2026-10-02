import Link from "next/link";

import { inboxKinds, inboxList, STAFF_INBOX_PATH, type InboxKind } from "@/content/inbox";

/**
 * Which form, and whether test submissions show. Plain links that change the
 * URL, so a filtered view can be bookmarked and needs no JavaScript.
 * aria-current marks the one in force.
 */
export function InboxFilter({ kind, includeTests }: { kind: InboxKind | null; includeTests: boolean }) {
  const href = (next: { kind: InboxKind | null; includeTests: boolean }) => {
    const params = new URLSearchParams();
    if (next.kind) params.set("kind", next.kind);
    if (next.includeTests) params.set("tests", "1");
    const query = params.toString();
    return query ? `${STAFF_INBOX_PATH}?${query}` : STAFF_INBOX_PATH;
  };
  const options: { id: InboxKind | null; label: string }[] = [
    { id: null, label: inboxList.allLabel },
    ...inboxKinds.map((k) => ({ id: k.id, label: k.label })),
  ];

  return (
    <nav aria-label={inboxList.filterLegend} className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => (
          <li key={option.id ?? "all"}>
            <Link
              href={href({ kind: option.id, includeTests })}
              aria-current={option.id === kind ? "page" : undefined}
              className={`link-inline ${option.id === kind ? "font-bold" : ""}`.trim()}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">
        {includeTests ? null : `${inboxList.testsHidden} `}
        <Link href={href({ kind, includeTests: !includeTests })} className="link-inline">
          {includeTests ? inboxList.hideTests : inboxList.showTests}
        </Link>
      </p>
    </nav>
  );
}
