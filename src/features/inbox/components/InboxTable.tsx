import Link from "next/link";

import { fileStates, flags, inboxKinds, inboxList, STAFF_INBOX_PATH, statusLabels } from "@/content/inbox";

import type { InboxItem } from "../queries.server";
import { deskName, formatReceived, specialtyName } from "./format";

/**
 * The inbox list. A real <table> with a caption and column headers, in a
 * keyboard-reachable horizontal scroll region at narrow widths, like the
 * article tables. Each row's first cell is the link that opens it.
 *
 * A resume's file state is a column of its own, so a row with no usable file
 * - refused, never arrived, not checked, none - is plain before anyone opens
 * it. Held and test rows say so in words, never in colour alone.
 */
export function InboxTable({ items }: { items: InboxItem[] }) {
  return (
    <div role="region" aria-label={inboxList.tableCaption} tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-left text-base">
        <caption className="sr-only">{inboxList.tableCaption}</caption>
        <thead>
          <tr className="border-b border-border-strong text-sm text-ink-muted">
            <th scope="col" className="py-3 pr-4 font-semibold">{inboxList.columns.from}</th>
            <th scope="col" className="py-3 pr-4 font-semibold">{inboxList.columns.received}</th>
            <th scope="col" className="py-3 pr-4 font-semibold">{inboxList.columns.form}</th>
            <th scope="col" className="py-3 pr-4 font-semibold">{inboxList.columns.about}</th>
            <th scope="col" className="py-3 pr-4 font-semibold">{inboxList.columns.status}</th>
            <th scope="col" className="py-3 pr-4 font-semibold">{inboxList.columns.file}</th>
            <th scope="col" className="py-3 font-semibold">{inboxList.columns.flags}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const form = inboxKinds.find((kind) => kind.id === item.kind)!;
            const about =
              item.kind === "resume"
                ? [specialtyName(item.summary.secondary, item.summary.primary), deskName(item.summary.secondary)]
                : [item.summary.primary, item.summary.secondary];
            return (
              <tr key={`${item.kind}-${item.id}`} className="border-b border-border align-top" data-inbox-row={item.kind}>
                <th scope="row" className="py-3 pr-4 font-normal">
                  <Link
                    href={`${STAFF_INBOX_PATH}/${item.kind}/${item.id}`}
                    className="link-inline font-semibold"
                    aria-label={inboxList.open(item.name || item.email)}
                  >
                    {item.name || item.email}
                  </Link>
                  <span className="block text-sm text-ink-muted">{item.email}</span>
                </th>
                <td className="py-3 pr-4 text-sm text-ink-muted">{formatReceived(item.receivedAt)}</td>
                <td className="py-3 pr-4">{form.singular}</td>
                <td className="py-3 pr-4">
                  {about[0]}
                  {about[1] ? <span className="block text-sm text-ink-muted">{about[1]}</span> : null}
                </td>
                <td className="py-3 pr-4">{statusLabels[item.status] ?? item.status}</td>
                <td className="py-3 pr-4" data-file-state={item.file ?? undefined}>
                  {item.file ? fileStates[item.file].label : null}
                </td>
                <td className="py-3 text-sm">
                  {item.held ? <span className="block font-semibold text-ink">{flags.held}</span> : null}
                  {item.isTest ? <span className="block text-ink-muted">{flags.test}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
