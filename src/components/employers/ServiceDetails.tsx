import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { servicesPage } from "@/content/employers";
import { engagementModels } from "@/content/taxonomy";

/**
 * In-page anchor nav for the five engagement models.
 *
 * A plain list of same-page links, labelled as a nav landmark so it shows up
 * in a screen reader's landmark list next to the site nav rather than
 * disappearing into the page. `scroll-padding-top` in globals.css keeps the
 * targeted heading clear of the sticky header when one of these is followed.
 */
export function ServicesAnchorNav() {
  return (
    <nav aria-label={servicesPage.onThisPageLabel} className="mt-10">
      <h2 className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
        {servicesPage.onThisPageLabel}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        {engagementModels.map((model) => (
          <li key={model.id}>
            <a
              href={`#${model.id}`}
              className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
            >
              <Icon name={model.icon} className="h-5 w-5 shrink-0" />
              {model.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * One <section> per engagement model, each with a stable anchor id that the
 * cards on /employers and the nav above link into.
 *
 * Every model covers the same three things in the same order - what it is,
 * when it fits, how the commercial arrangement works - so they can be read
 * against each other.
 *
 * A commercial point the client has not confirmed carries `detail: null` and
 * is skipped entirely: no term, no label, no empty row (CLAUDE.md rule 6).
 * The unconfirmed points stay in the data so there is a list to fill in, and
 * they appear on the page the moment they have a value.
 *
 * Bands alternate tone so the boundary between models is visible without
 * relying on a heavier rule.
 */
export function ServiceDetails() {
  return (
    <>
      {engagementModels.map((model, index) => (
        <section
          key={model.id}
          id={model.id}
          aria-labelledby={`${model.id}-heading`}
          className={
            index % 2 === 0
              ? "bg-surface py-14 sm:py-16 lg:py-20"
              : "bg-surface-muted py-14 sm:py-16 lg:py-20"
          }
        >
          <Container>
            <div className="max-w-3xl">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand text-white">
                <Icon name={model.icon} />
              </span>
              <h2
                id={`${model.id}-heading`}
                className="mt-5 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                {model.name}
              </h2>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-10">
              <div>
                <h3 className="text-sm font-semibold tracking-widest text-accent uppercase">
                  {servicesPage.headings.whatItIs}
                </h3>
                <p className="mt-3 text-base text-ink-muted">{model.whatItIs}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold tracking-widest text-accent uppercase">
                  {servicesPage.headings.whenItFits}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {model.whenItFits.map((item) => (
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

              <div>
                <h3 className="text-sm font-semibold tracking-widest text-accent uppercase">
                  {servicesPage.headings.commercial}
                </h3>
                <dl className="mt-3 flex flex-col gap-4">
                  {model.commercial
                    .filter((point) => point.detail !== null)
                    .map((point) => (
                      <div key={point.id}>
                        <dt className="text-base font-semibold text-ink">
                          {point.label}
                        </dt>
                        <dd className="mt-1 text-base text-ink-muted">
                          {point.detail}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
          </Container>
        </section>
      ))}
    </>
  );
}
