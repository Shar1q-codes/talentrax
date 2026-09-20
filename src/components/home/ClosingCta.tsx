import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { closingCta } from "@/content/home";

/**
 * Closing call-to-action band, on the dark brand surface.
 *
 * The `brand` tone applies the `on-brand` class, which swaps the global focus
 * ring to white so it stays visible against the navy (see globals.css).
 */
export function ClosingCta() {
  return (
    <Section tone="brand" labelledBy="closing-cta-heading">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="closing-cta-heading"
          className="text-3xl font-bold tracking-tight text-on-brand sm:text-4xl"
        >
          {closingCta.heading}
        </h2>
        <p className="mt-5 text-lg text-on-brand-muted">
          {closingCta.description}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          {closingCta.ctas.map((cta) => (
            <ButtonLink
              key={cta.href}
              href={cta.href}
              variant={cta.variant}
              size="lg"
            >
              {cta.label}
            </ButtonLink>
          ))}
        </div>
        <p className="mt-6 text-sm text-on-brand-muted">
          {closingCta.footnote}
        </p>
      </div>
    </Section>
  );
}
