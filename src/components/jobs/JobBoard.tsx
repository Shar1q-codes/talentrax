"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { board } from "@/content/jobs";
import type { FieldConfig, SelectOption } from "@/content/request-talent";
import {
  deskName,
  engagementModels,
  engagementName,
  specialtyAreas,
  specialtyName,
} from "@/content/taxonomy";
import type { Job } from "@/lib/jobs";
import {
  formatLocation,
  formatPayRange,
  formatPostedDate,
} from "@/lib/jobs-format";

/**
 * The job list and its filters.
 *
 * This renders only when there is at least one job. An empty board shows the
 * empty state instead (components/jobs/EmptyBoard.tsx) - controls that filter
 * nothing are worse than no controls, because they imply the board has
 * something in it that the reader has failed to find.
 *
 * Filter OPTIONS come from content/taxonomy.ts, the same source the services
 * pages and both forms read, but are narrowed to the values actually present
 * in the current jobs: a filter that can only ever return nothing is the same
 * lie in smaller print. State has no taxonomy to derive from, so its options
 * come from the postings themselves.
 *
 * Filtering is client state. The page is prerendered with every job in the
 * HTML, so a reader with no JavaScript sees the full list rather than an
 * empty shell - they just cannot narrow it.
 */

type Filters = {
  desk: string;
  specialty: string;
  state: string;
  engagement: string;
};

const NO_FILTER = "";

const emptyFilters: Filters = {
  desk: NO_FILTER,
  specialty: NO_FILTER,
  state: NO_FILTER,
  engagement: NO_FILTER,
};

/** Structural: ids are DOM plumbing, the label is copy from content. */
function filterField(id: string, label: string): FieldConfig {
  return { id, label, required: false };
}

function matches(job: Job, filters: Filters): boolean {
  if (filters.desk !== NO_FILTER && job.deskId !== filters.desk) return false;
  if (filters.specialty !== NO_FILTER && job.specialtyId !== filters.specialty) {
    return false;
  }
  if (filters.state !== NO_FILTER && job.location.state !== filters.state) {
    return false;
  }
  if (
    filters.engagement !== NO_FILTER &&
    job.engagementId !== filters.engagement
  ) {
    return false;
  }
  return true;
}

export function JobBoard({ jobs }: { jobs: Job[] }) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const deskOptions = useMemo<SelectOption[]>(() => {
    const present = new Set(jobs.map((job) => job.deskId));
    return specialtyAreas
      .filter((area) => present.has(area.id))
      .map((area) => ({ value: area.id, label: area.name }));
  }, [jobs]);

  /** Narrowed to the chosen desk, so the two filters cannot contradict. */
  const specialtyOptions = useMemo<SelectOption[]>(() => {
    const relevant = jobs.filter(
      (job) => filters.desk === NO_FILTER || job.deskId === filters.desk,
    );
    const present = new Set(relevant.map((job) => job.specialtyId));
    return specialtyAreas
      .filter((area) => filters.desk === NO_FILTER || area.id === filters.desk)
      .flatMap((area) =>
        area.subSpecialties
          .filter((sub) => present.has(sub.id))
          .map((sub) => ({ value: sub.id, label: sub.name })),
      );
  }, [jobs, filters.desk]);

  const stateOptions = useMemo<SelectOption[]>(() => {
    const present = [...new Set(jobs.map((job) => job.location.state))].sort();
    return present.map((state) => ({ value: state, label: state }));
  }, [jobs]);

  const engagementOptions = useMemo<SelectOption[]>(() => {
    const present = new Set(jobs.map((job) => job.engagementId));
    return engagementModels
      .filter((model) => present.has(model.id))
      .map((model) => ({ value: model.id, label: model.name }));
  }, [jobs]);

  const visible = jobs.filter((job) => matches(job, filters));
  const isFiltered = Object.values(filters).some((value) => value !== NO_FILTER);

  function setFilter(key: keyof Filters) {
    return (value: string) =>
      setFilters((current) => ({
        ...current,
        [key]: value,
        // Changing desk invalidates a specialty that belonged to the old one.
        ...(key === "desk" ? { specialty: NO_FILTER } : {}),
      }));
  }

  return (
    <div>
      <fieldset className="rounded-lg border border-border bg-surface-muted p-5 sm:p-6">
        <legend className="px-2 text-base font-semibold text-ink">
          {board.filtersLegend}
        </legend>
        <p className="text-sm text-ink-muted">{board.filtersHint}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            field={filterField("filter-desk", board.filterLabels.desk)}
            value={filters.desk}
            onChange={setFilter("desk")}
            options={deskOptions}
            placeholderLabel={board.anyOption}
          />
          <SelectField
            field={filterField("filter-specialty", board.filterLabels.specialty)}
            value={filters.specialty}
            onChange={setFilter("specialty")}
            options={specialtyOptions}
            placeholderLabel={board.anyOption}
          />
          <SelectField
            field={filterField("filter-state", board.filterLabels.state)}
            value={filters.state}
            onChange={setFilter("state")}
            options={stateOptions}
            placeholderLabel={board.anyOption}
          />
          <SelectField
            field={filterField(
              "filter-engagement",
              board.filterLabels.engagement,
            )}
            value={filters.engagement}
            onChange={setFilter("engagement")}
            options={engagementOptions}
            placeholderLabel={board.anyOption}
          />
        </div>

        {isFiltered ? (
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setFilters(emptyFilters)}>
              {board.clearLabel}
            </Button>
          </div>
        ) : null}
      </fieldset>

      {/*
        Counting what is on the page is the one number this site publishes,
        and it is the permitted kind: read from the data, not claimed.
      */}
      <p aria-live="polite" className="mt-8 text-base font-semibold text-ink">
        {visible.length === 1
          ? board.resultsLabelOne
          : `${visible.length} ${board.resultsLabelMany}`}
      </p>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h3 className="text-xl font-bold text-ink">
            {board.noMatchesHeading}
          </h3>
          <p className="mt-3 text-base text-ink-muted">{board.noMatchesBody}</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={() => setFilters(emptyFilters)}>
              {board.clearLabel}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-6">
          {visible.map((job) => (
            <Card as="li" key={job.id} className="flex flex-col">
              <h3 className="text-xl font-bold text-ink">
                <Link
                  href={`/jobs/${job.slug}`}
                  className="no-underline transition-colors hover:text-brand hover:underline hover:underline-offset-4"
                >
                  {job.title}
                  <span aria-hidden="true"> &rarr;</span>
                </Link>
              </h3>

              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                    {board.metaLabels.location}
                  </dt>
                  <dd className="mt-1 text-base text-ink">
                    {formatLocation(job.location)}
                    {" - "}
                    {board.workModeLabels[job.location.workMode] ??
                      job.location.workMode}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                    {board.metaLabels.pay}
                  </dt>
                  <dd className="mt-1 text-base text-ink">
                    {formatPayRange(
                      job.pay,
                      board.payUnitLabels[job.pay.unit] ?? job.pay.unit,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                    {board.metaLabels.engagement}
                  </dt>
                  <dd className="mt-1 text-base text-ink">
                    {engagementName(job.engagementId)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                    {board.metaLabels.specialty}
                  </dt>
                  <dd className="mt-1 text-base text-ink">
                    {deskName(job.deskId)}
                    {" / "}
                    {specialtyName(job.deskId, job.specialtyId)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                    {board.metaLabels.posted}
                  </dt>
                  <dd className="mt-1 text-base text-ink">
                    {formatPostedDate(job.datePosted)}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
