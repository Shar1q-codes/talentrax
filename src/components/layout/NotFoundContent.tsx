import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { footerColumns } from "@/content/navigation";

/**
 * The body of the 404 page, without chrome. Two files render it:
 *
 *   app/not-found.tsx              an unmatched URL. It renders in the root
 *                                  layout, which has no chrome, so it wraps
 *                                  this in SiteChrome.
 *   app/(marketing)/not-found.tsx  notFound() thrown by a public route (an
 *                                  unknown job or article). That renders
 *                                  inside the (marketing) layout, which
 *                                  already draws the chrome, so it renders
 *                                  this bare. Wrapping it there too drew two
 *                                  headers, two <main>s and two footers.
 *
 * Alongside the two primary actions it surfaces the main section links,
 * which is usually faster than sending someone back to the home page.
 */
export function NotFoundContent() {
  return (
    <Container>
      <div className="mx-auto max-w-2xl py-20 sm:py-28 lg:py-32">
        <p className="text-sm font-semibold tracking-widest text-accent uppercase">
          Error 404
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          We could not find that page
        </h1>

        <p className="mt-6 text-lg text-ink-muted">
          The link may be out of date, or the page may not have been built yet.
          Most of this site is still coming soon.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" variant="primary">
            Back to home
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <h2 className="text-base font-bold text-ink">
            Or try one of these sections
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            {footerColumns.map((column) => (
              <nav key={column.id} aria-labelledby={`nf-${column.id}`}>
                <h3
                  id={`nf-${column.id}`}
                  className="text-sm font-semibold tracking-widest text-ink-subtle uppercase"
                >
                  {column.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={`${column.id}-${link.href}-${link.label}`}>
                      <TextLink href={link.href} className="text-base">
                        {link.label}
                      </TextLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
