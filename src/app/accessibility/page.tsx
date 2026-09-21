import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, SectionHeader } from "@/components/ui/Section";
import {
  accessibilityHero,
  accessibilityMeta,
  measures,
  notTested,
  reportBarrier,
  standard,
} from "@/content/accessibility";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: accessibilityMeta.title,
  description: accessibilityMeta.description,
  path: "/accessibility",
});

/**
 * Accessibility.
 *
 * THIS PAGE DOES NOT CLAIM CONFORMANCE and must not start to. Nothing here
 * has been operated in a browser by the people who built it - no keyboard
 * run-through, no screen reader, no zoom testing, no independent audit - so a
 * conformance claim would be false, and a false accessibility claim in the US
 * is what demand letters are made of.
 *
 * It says instead: the standard the site is built to AIM at, the measures
 * actually in place, what has not been tested, and how to report a barrier.
 * The "not yet verified" section is the most valuable thing on the page and
 * should not be trimmed for tone.
 *
 * No date, no version, no "last reviewed" line. A review date is a claim too,
 * and nothing has been reviewed.
 */
export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow={accessibilityHero.eyebrow}
        heading={accessibilityHero.heading}
        intro={accessibilityHero.intro}
      />

      <Section id="the-standard" labelledBy="the-standard-heading">
        <SectionHeader
          headingId="the-standard-heading"
          eyebrow={standard.eyebrow}
          heading={standard.heading}
          intro={standard.intro}
        />
        <div className="max-w-3xl">
          {standard.body.map((paragraph) => (
            <p key={paragraph} className="mt-5 text-lg text-ink-muted first:mt-0">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      <Section id="in-place" tone="muted" labelledBy="in-place-heading">
        <SectionHeader
          headingId="in-place-heading"
          eyebrow={measures.eyebrow}
          heading={measures.heading}
          intro={measures.intro}
        />
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {measures.items.map((measure) => (
            <div key={measure.id}>
              <dt className="flex items-start gap-2 text-base font-bold text-ink">
                <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-brand" />
                {measure.title}
              </dt>
              <dd className="mt-2 pl-7 text-base text-ink-muted">
                {measure.detail}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="not-verified" labelledBy="not-verified-heading">
        <SectionHeader
          headingId="not-verified-heading"
          eyebrow={notTested.eyebrow}
          heading={notTested.heading}
          intro={notTested.intro}
        />
        <div className="max-w-3xl">
          <ul className="flex flex-col gap-3 border-l-4 border-accent py-1 pl-5">
            {notTested.items.map((item) => (
              <li key={item} className="text-lg text-ink">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base text-ink-muted">{notTested.closing}</p>
        </div>
      </Section>

      <Section
        id="report-a-barrier"
        tone="muted"
        labelledBy="report-a-barrier-heading"
      >
        <SectionHeader
          headingId="report-a-barrier-heading"
          eyebrow={reportBarrier.eyebrow}
          heading={reportBarrier.heading}
          intro={reportBarrier.intro}
        />
        <div className="max-w-3xl">
          {reportBarrier.body.map((paragraph) => (
            <p key={paragraph} className="mt-5 text-base text-ink-muted first:mt-0">
              {paragraph}
            </p>
          ))}
          <div className="mt-8">
            <ButtonLink href={reportBarrier.cta.href} variant="primary">
              {reportBarrier.cta.label}
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
