import { Button } from "@/components/ui/Button";
import {
  detailLabels,
  fileStates,
  flags,
  inboxDetail,
  nothingArrivedYet,
  refusedReasons,
  settableStatuses,
  STAFF_INBOX_PATH,
  statusLabels,
} from "@/content/inbox";

import { setStatusAction, setTestAction } from "../actions";
import type { Submission } from "../queries.server";
import { deskName, engagementName, formatReceived, specialtyName, stateName } from "./format";

/**
 * One submission: every field it sent, its resume file if it has one, and
 * the two things staff may change here (status, test). Server-rendered,
 * plain forms: nothing here needs JavaScript.
 *
 * THE DOWNLOAD IS OFFERED ONLY FOR A RECEIVED FILE. Refused, never arrived,
 * not checked and no file all say what happened and offer nothing to open.
 * The link itself goes through a route that asks again, and the storage
 * policy refuses every file not received (migration 18), so a hand-typed
 * URL gets nothing either.
 */

function display(kind: Submission["kind"], key: string, fields: Record<string, unknown>): string {
  const value = fields[key];
  if (key === "desk") return deskName(value) ?? inboxDetail.none;
  if (key === "specialty") return specialtyName(fields.desk, value) ?? inboxDetail.none;
  if (key === "state") return value ? stateName(value) : inboxDetail.none;
  if (key === "requested_service") return value ? engagementName(value) : inboxDetail.none;
  if (key === "engagement_types") {
    const list = Array.isArray(value) ? value.map(engagementName) : [];
    return list.length > 0 ? list.join(", ") : inboxDetail.none;
  }
  if (key === "enquiry_type") return value === "employer" ? "Employer" : "Job seeker";
  if (key === "salary") {
    const { salary_min: min, salary_max: max, salary_unit: unit } = fields;
    if (min == null && max == null) return inboxDetail.none;
    const range = [min, max].filter((n) => n != null).join(" to ");
    return `${range} USD per ${unit}`;
  }
  if (typeof value === "boolean") return value ? inboxDetail.yes : inboxDetail.no;
  if (value === null || value === undefined || value === "") return inboxDetail.none;
  return String(value);
}

export function SubmissionView({ submission, flash }: { submission: Submission; flash: "saved" | "notsaved" | null }) {
  const labels = detailLabels[submission.kind] as Record<string, string>;
  const hidden = (
    <>
      <input type="hidden" name="kind" value={submission.kind} />
      <input type="hidden" name="id" value={submission.id} />
    </>
  );

  return (
    <div className="flex flex-col gap-12">
      {flash ? (
        <p role="status" className="rounded-lg border border-brand bg-brand-soft p-5 text-base text-ink">
          {flash === "saved" ? inboxDetail.saved : inboxDetail.notSaved}
        </p>
      ) : null}

      <p className="text-base text-ink-muted">
        {inboxDetail.received}: {formatReceived(submission.receivedAt)}
        {submission.held ? (
          <span className="mt-2 block font-semibold text-ink">
            {flags.held}: {flags.heldWhy[submission.held]}
          </span>
        ) : null}
        {submission.isTest ? <span className="mt-2 block">{flags.test}</span> : null}
      </p>

      <section aria-labelledby="fields-heading" className="flex flex-col gap-4">
        <h2 id="fields-heading" className="text-xl font-bold text-ink">{inboxDetail.fieldsHeading}</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(10rem,auto)_1fr]">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="text-sm font-semibold text-ink-muted">{label}</dt>
              <dd className="whitespace-pre-line break-words text-base text-ink">
                {display(submission.kind, key, submission.fields)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {submission.file ? (
        <section aria-labelledby="file-heading" className="flex flex-col gap-3" data-file-state={submission.file.state}>
          <h2 id="file-heading" className="text-xl font-bold text-ink">{inboxDetail.fileHeading}</h2>
          <p className="text-base font-semibold text-ink">{fileStates[submission.file.state].label}</p>
          <p className="text-base text-ink-muted">
            {submission.file.checkedMissing ? nothingArrivedYet : fileStates[submission.file.state].detail}
            {submission.file.state === "refused" && submission.file.reason && refusedReasons[submission.file.reason]
              ? ` It was ${refusedReasons[submission.file.reason]}.`
              : null}
          </p>
          {submission.file.state === "received" ? (
            <div>
              {/* A route, not a page: it answers with a one-minute download link, or a 404. */}
              <a href={`${STAFF_INBOX_PATH}/file/${submission.id}`} className="link-inline font-semibold">
                {inboxDetail.download(submission.file.filename ?? "resume")}
              </a>
              <p className="mt-1 text-sm text-ink-muted">{inboxDetail.downloadNote}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="actions-heading" className="flex flex-col gap-6">
        <h2 id="actions-heading" className="text-xl font-bold text-ink">{inboxDetail.actionsHeading}</h2>
        <form action={setStatusAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {hidden}
          <div className="flex flex-col gap-2">
            <label htmlFor="inbox-status" className="text-base font-semibold text-ink">
              {inboxDetail.statusLegend}
            </label>
            <select
              id="inbox-status"
              name="status"
              defaultValue={submission.status}
              className="block min-h-11 rounded-md border border-border-control bg-surface px-3 py-2.5 text-base text-ink transition-colors hover:border-brand"
            >
              {/* A status set elsewhere stays visible, even if it cannot be set here. */}
              {(settableStatuses[submission.kind].includes(submission.status)
                ? settableStatuses[submission.kind]
                : [submission.status, ...settableStatuses[submission.kind]]
              ).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status] ?? status}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">{inboxDetail.saveStatus}</Button>
        </form>
        <form action={setTestAction} className="flex flex-col gap-2">
          {hidden}
          <input type="hidden" name="isTest" value={submission.isTest ? "false" : "true"} />
          <div>
            <Button type="submit" variant="secondary">
              {submission.isTest ? inboxDetail.markReal : inboxDetail.markTest}
            </Button>
          </div>
          <p className="text-sm text-ink-muted">{inboxDetail.testExplained}</p>
        </form>
      </section>
    </div>
  );
}
