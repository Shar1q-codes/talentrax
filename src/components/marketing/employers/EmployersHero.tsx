import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { employersHero } from "@/content/employers";

/**
 * Employers hero. Holds the page's single <h1>.
 *
 * The visual is an IMAGE SLOT: a token-coloured gradient block with an inline
 * SVG motif, not a photograph and not a placeholder image service. The motif
 * reads as a shortlist narrowing to one hire, which is the section's whole
 * argument, but it carries no information the copy does not, so the SVG
 * itself is aria-hidden behind a described slot.
 */
export function EmployersHero() {
  return (
    <section className="border-b border-border bg-surface">
      <Container>
        <div className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:py-28">
          <div className="lg:col-span-7">
            <p className="text-sm font-semibold tracking-widest text-accent uppercase">
              {employersHero.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {employersHero.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-muted sm:text-xl">
              {employersHero.subhead}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {employersHero.ctas.map((cta) => (
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
          </div>

          {/* IMAGE SLOT - replace with client photography. */}
          <div className="lg:col-span-5">
            <div
              role="img"
              aria-label={employersHero.imageSlotLabel}
              className="image-slot relative aspect-4/3 w-full overflow-hidden rounded-xl"
            >
              <svg
                viewBox="0 0 400 300"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
                focusable="false"
              >
                <g
                  fill="none"
                  stroke="var(--color-on-brand)"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                >
                  <path d="M60 60h280M60 110h280M60 160h190M60 210h120" />
                  <path d="M250 160 330 210" />
                </g>
                <g fill="var(--color-on-brand)" fillOpacity="0.85">
                  <circle cx="40" cy="60" r="6" />
                  <circle cx="40" cy="110" r="6" />
                  <circle cx="40" cy="160" r="6" />
                  <circle cx="40" cy="210" r="6" />
                  <circle cx="340" cy="210" r="12" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
