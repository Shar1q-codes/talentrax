import { Container } from "@/components/ui/Container";
import { trustBar } from "@/content/home";

/**
 * Placeholder statistics band.
 *
 * Every figure is visibly a placeholder ("0,000+", "00 days") and the note
 * underneath says so in plain language. Nothing here should ever be read as
 * a verified claim.
 *
 * Markup is a <dl>: each figure is the value for its label, which is what a
 * description list is for, and it reads correctly in a screen reader.
 */
export function TrustBar() {
  return (
    <section aria-label={trustBar.ariaLabel} className="bg-surface-muted">
      <Container>
        <div className="py-12 sm:py-14">
          <dl className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {trustBar.stats.map((stat) => (
              // flex-col-reverse renders the figure above its label while
              // keeping the dt-then-dd source order a description list needs.
              <div
                key={stat.id}
                className="flex flex-col-reverse gap-1 text-center sm:text-left"
              >
                <dt className="text-base font-medium text-ink-muted">
                  {stat.label}
                </dt>
                <dd className="text-4xl font-bold tracking-tight text-brand sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-sm text-ink-subtle">{trustBar.note}</p>
        </div>
      </Container>
    </section>
  );
}
