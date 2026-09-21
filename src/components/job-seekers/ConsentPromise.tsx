import Link from "next/link";

import { CommitmentPanel } from "@/components/shared/ProcessTimeline";
import { Section, SectionHeader } from "@/components/ui/Section";
import { consentSection, PRIVACY_PATH } from "@/content/job-seekers";

/**
 * What happens to a candidate's resume and data, in plain language.
 *
 * Same panel the Employers process uses for its commitments, because these
 * are the same kind of thing: short promises the business has to keep. The
 * heading comes from the section header above it, so the panel renders
 * without one of its own.
 *
 * The link points at /privacy-policy, which is still a coming-soon route. It
 * has to point at a route that exists - an href to a path with no page would
 * break the rule that every link resolves - and it starts working the moment
 * that page is built.
 */
export function ConsentPromise() {
  return (
    <Section id="your-data" labelledBy="your-data-heading">
      <SectionHeader
        headingId="your-data-heading"
        eyebrow={consentSection.eyebrow}
        heading={consentSection.heading}
        intro={consentSection.intro}
      />

      <CommitmentPanel commitments={consentSection.promises} className="mt-0">
        <p className="mt-6 border-t border-brand pt-6 text-base text-ink-muted">
          {consentSection.privacyLinkIntro}{" "}
          <Link
            href={PRIVACY_PATH}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {consentSection.privacyLinkLabel}
          </Link>
          .
        </p>
      </CommitmentPanel>
    </Section>
  );
}
