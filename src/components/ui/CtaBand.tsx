import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import type { CtaBandContent } from "@/content/types";

/**
 * Closing call-to-action band on the dark brand surface. Shared by the home
 * page and every Employers route - the copy differs, the band does not.
 *
 * The `brand` tone applies the `on-brand` class, which swaps the global focus
 * ring to white so it stays visible against the navy (see globals.css).
 *
 * `headingId` must be unique on the page; it names the section landmark.
 */
export function CtaBand({
  content,
  headingId,
}: {
  content: CtaBandContent;
  headingId: string;
}) {
  return (
    <Section tone="brand" labelledBy={headingId}>
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id={headingId}
          className="text-3xl font-bold tracking-tight text-on-brand sm:text-4xl"
        >
          {content.heading}
        </h2>
        <p className="mt-5 text-lg text-on-brand-muted">{content.description}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          {content.ctas.map((cta) => (
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
        <p className="mt-6 text-sm text-on-brand-muted">{content.footnote}</p>
      </div>
    </Section>
  );
}
