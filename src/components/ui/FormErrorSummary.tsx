import type { Ref } from "react";

import { Icon } from "@/components/ui/Icon";

/**
 * The error summary that appears at the top of a form after a failed submit.
 *
 * role="alert" so it is announced, tabIndex={-1} and a forwarded ref so the
 * page can move focus to it, and every error is a link to the control that
 * produced it. Clicking one focuses that control as well as jumping to it,
 * because a bare fragment jump does not reliably focus a radio or a checkbox.
 *
 * The heading level is a prop: this sits inside whatever section the form is
 * in, and the right level depends on that, not on this component.
 *
 * Used by the three account forms. The requisition, resume and contact forms
 * each still carry their own copy of this markup - they predate it, and
 * retrofitting three working forms did not belong in the same commit as the
 * authentication screens.
 */
export type SummaryError = {
  /** The element to focus. Must be a real id in the document. */
  anchor: string;
  message: string;
};

export function FormErrorSummary({
  errors,
  title,
  intro,
  headingLevel = "h2",
  ref,
}: {
  errors: SummaryError[];
  title: string;
  intro: string;
  headingLevel?: "h2" | "h3";
  ref?: Ref<HTMLDivElement>;
}) {
  if (errors.length === 0) return null;

  const Heading = headingLevel;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-lg border border-danger bg-danger-soft p-5"
    >
      <Heading className="flex items-start gap-2 text-lg font-bold text-danger">
        <Icon name="alert" className="mt-1 h-5 w-5 shrink-0" />
        {title}
      </Heading>
      <p className="mt-2 text-base text-ink">{intro}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {errors.map((error) => (
          <li key={error.anchor}>
            <a
              href={`#${error.anchor}`}
              onClick={() => document.getElementById(error.anchor)?.focus()}
              className="text-base font-semibold text-danger underline underline-offset-4"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
