import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { hero } from "@/content/home";

/**
 * Hero. Holds the page's single <h1>.
 *
 * The visual to the right is an IMAGE SLOT: a token-coloured gradient block
 * with an inline SVG motif, not a photograph and not a placeholder image
 * service. It is aria-hidden - it carries no information a screen-reader user
 * would miss.
 */
export function Hero() {
  return (
    <section className="border-b border-border bg-surface">
      <Container>
        <div className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-12 lg:py-28">
          <div className="lg:col-span-7">
            <p className="text-sm font-semibold tracking-widest text-accent uppercase">
              {hero.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-muted sm:text-xl">
              {hero.subhead}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {hero.ctas.map((cta) => (
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
              aria-label={hero.imageSlotLabel}
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
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                >
                  <circle cx="200" cy="150" r="52" />
                  <circle cx="200" cy="150" r="88" />
                  <circle cx="200" cy="150" r="124" />
                  <path d="M0 150h400M200 0v300" />
                </g>
                <g fill="var(--color-on-brand)" fillOpacity="0.9">
                  <circle cx="200" cy="62" r="7" />
                  <circle cx="288" cy="150" r="7" />
                  <circle cx="200" cy="238" r="7" />
                  <circle cx="112" cy="150" r="7" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
