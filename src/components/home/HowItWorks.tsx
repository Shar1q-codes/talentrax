import { Section, SectionHeader } from "@/components/ui/Section";
import { howItWorks } from "@/content/home";

/**
 * Four-step process.
 *
 * Rendered as an ordered list: the sequence is the content. The big "01"
 * numerals are decorative duplicates of the list order, so they are
 * aria-hidden to stop screen readers announcing "zero one" before each step.
 */
export function HowItWorks() {
  return (
    // Default surface: the latest-articles rail above it is muted.
    <Section id="how-it-works" labelledBy="how-it-works-heading">
      <SectionHeader
        headingId="how-it-works-heading"
        eyebrow={howItWorks.eyebrow}
        heading={howItWorks.heading}
        intro={howItWorks.intro}
      />

      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {howItWorks.steps.map((step) => (
          <li key={step.id} className="flex flex-col">
            {/* text-brand, not a faint grey: the contrast bar applies to
                decorative text too (11.2:1 on --color-surface). */}
            <span
              aria-hidden="true"
              className="text-5xl font-bold tracking-tight text-brand"
            >
              {step.number}
            </span>
            <span className="mt-4 h-px w-12 bg-accent" aria-hidden="true" />
            <h3 className="mt-5 text-lg font-bold text-ink">{step.title}</h3>
            <p className="mt-3 text-base text-ink-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
