import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import type { ProcessCommitment, ProcessContent } from "@/content/types";

/**
 * A numbered process: each step states what the reader receives, with an
 * optional commitments panel underneath. A step may also carry a "what we
 * do" list; when it does not, the outcomes list takes the full width.
 *
 * Shared by /employers ("how a search runs") and /job-seekers ("how applying
 * works"). With no statistics or testimonials permitted anywhere on this
 * site, describing how the work actually runs is what carries the
 * credibility, and the two audiences should recognise the same shape.
 *
 * Structure:
 *   <ol>            the sequence IS the content, so it is an ordered list
 *     <li>          one step, h3
 *       <div>       "what we do"  - h4 + ul (only when the step carries it)
 *       <div>       "what you get" - h4 + ul
 *
 * The large "01" numerals duplicate the list order, so they are aria-hidden:
 * a screen reader already announces "1 of 5" and does not need "zero one"
 * first. Heading order runs h2 -> h3 -> h4 with nothing skipped.
 *
 * The connector rule between steps is a decorative pseudo-element on the
 * list item, hidden on the last one. It is drawn inside the item's own left
 * padding so nothing overhangs the 16px page gutter at 320px.
 */
export function ProcessTimeline({
  content,
  id,
  headingId,
  tone = "default",
}: {
  content: ProcessContent;
  id: string;
  headingId: string;
  tone?: "default" | "muted";
}) {
  return (
    <Section id={id} tone={tone} labelledBy={headingId}>
      <SectionHeader
        headingId={headingId}
        eyebrow={content.eyebrow}
        heading={content.heading}
        intro={content.intro}
      />

      <ol className="flex flex-col">
        {content.steps.map((step) => (
          <li
            key={step.id}
            className={[
              "relative pb-10 pl-14 last:pb-0 sm:pl-20",
              // Connector rule, centred under the numeral badge.
              "after:absolute after:top-12 after:bottom-0 after:left-5 after:w-px",
              "after:bg-border-strong after:content-[''] last:after:hidden",
              "sm:after:left-7",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-base font-bold text-white sm:h-14 sm:w-14 sm:text-lg"
            >
              {step.number}
            </span>

            <h3 className="text-xl font-bold text-ink sm:text-2xl">
              {step.title}
            </h3>
            <p className="mt-3 max-w-3xl text-base text-ink-muted">
              {step.summary}
            </p>

            <div
              className={[
                "mt-6 grid gap-4 rounded-lg border border-border bg-surface-muted p-5 sm:gap-6 sm:p-6",
                step.weDo && content.labels.weDo ? "sm:grid-cols-2" : "",
              ].join(" ")}
            >
              {step.weDo && content.labels.weDo ? (
                <div>
                  <h4 className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
                    {content.labels.weDo}
                  </h4>
                  <ul className="mt-3 flex flex-col gap-2">
                    {step.weDo.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-base text-ink-muted"
                      >
                        <Icon
                          name="check"
                          className="mt-1.5 h-4 w-4 shrink-0 text-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div
                className={
                  step.weDo && content.labels.weDo
                    ? "border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
                    : ""
                }
              >
                <h4 className="text-sm font-semibold tracking-widest text-accent-strong uppercase">
                  {content.labels.youGet}
                </h4>
                <ul className="mt-3 flex flex-col gap-2">
                  {step.youGet.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-base text-ink"
                    >
                      <Icon
                        name="check"
                        className="mt-1.5 h-4 w-4 shrink-0 text-brand"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {content.commitments && content.commitmentsHeading ? (
        <CommitmentPanel
          heading={content.commitmentsHeading}
          commitments={content.commitments}
        />
      ) : null}
    </Section>
  );
}

/**
 * The promises that fall out of a process. Also used on its own by the Job
 * Seekers consent section, which is the same shape: a heading over a list of
 * short title/detail pairs.
 */
export function CommitmentPanel({
  heading,
  commitments,
  className = "mt-12",
  children,
}: {
  /** Omitted when the panel sits under a section heading that already names it. */
  heading?: string;
  commitments: ProcessCommitment[];
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-brand bg-brand-soft p-6 sm:p-8 ${className}`}
    >
      {heading ? (
        <h3 className="text-xl font-bold text-ink sm:text-2xl">{heading}</h3>
      ) : null}
      <dl className={`grid gap-6 sm:grid-cols-2 ${heading ? "mt-6" : ""}`}>
        {commitments.map((commitment) => (
          <div key={commitment.id}>
            <dt className="flex items-start gap-2 text-base font-bold text-brand">
              <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-brand" />
              {commitment.title}
            </dt>
            <dd className="mt-2 pl-7 text-base text-ink-muted">
              {commitment.detail}
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
