import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { footerColumns } from "@/content/navigation";
import { site } from "@/content/site";

/**
 * Site footer: four link columns from content/navigation.ts, a contact block
 * from content/site.ts, and the copyright line.
 *
 * The contact block renders only the details the client has actually
 * confirmed. Everything in content/site.ts is `isPlaceholder: true` today -
 * a 555 number reserved for fiction, an unprovisioned mailbox, and an
 * address line that literally reads "to be confirmed" - so the block does not
 * render at all. Publishing an invented phone number on every page is the
 * same mistake as a bracketed placeholder, and rule 5 covers both.
 *
 * Server component - no interactivity.
 *
 * Each column is its own <nav> labelled by its heading, so screen-reader
 * users can jump straight to "Legal" rather than wading through one giant
 * unlabelled list.
 */
export function Footer() {
  const year = Math.max(
    site.foundingCopyrightYear,
    new Date().getFullYear(),
  );

  const contactRows = [
    site.contact.phone,
    site.contact.email,
    site.contact.address,
    site.contact.hours,
  ].filter((row) => !row.isPlaceholder);

  return (
    <footer className="on-brand border-t border-border bg-surface-brand text-on-brand">
      <Container>
        <div className="grid gap-12 py-16 lg:grid-cols-12 lg:gap-8">
          {/* Identity + contact */}
          <div className="lg:col-span-4">
            <Logo tone="inverse" />
            <p className="mt-4 max-w-xs text-base text-on-brand-muted">
              {site.tagline}.
            </p>

            {contactRows.length > 0 ? (
              <>
                <h2 className="mt-8 text-sm font-semibold tracking-widest text-on-brand uppercase">
                  Contact
                </h2>
                <ul className="mt-4 flex flex-col gap-2 text-base text-on-brand-muted">
                  {contactRows.map((row) => (
                    <li key={row.display}>
                      {row.href ? (
                        <a
                          href={row.href}
                          className="text-on-brand underline decoration-on-brand-muted underline-offset-4 transition-colors hover:decoration-on-brand"
                        >
                          {row.display}
                        </a>
                      ) : (
                        row.display
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/* Rendered only once real profile URLs exist in content/site.ts. */}
            {site.social.length > 0 ? (
              <nav aria-label="Social media" className="mt-6">
                <ul className="flex flex-wrap gap-4">
                  {site.social.map((profile) => (
                    <li key={profile.href}>
                      <a
                        href={profile.href}
                        className="text-on-brand underline underline-offset-4"
                      >
                        {profile.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>

          {/* Link columns */}
          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <nav key={column.id} aria-labelledby={column.id}>
                <h2
                  id={column.id}
                  className="text-sm font-semibold tracking-widest text-on-brand uppercase"
                >
                  {column.title}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={`${column.id}-${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-base text-on-brand-muted no-underline transition-colors hover:text-on-brand hover:underline hover:underline-offset-4"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-t border-white/20 py-8">
          <p className="text-sm text-on-brand-muted">
            &copy; {year} {site.legalName}. All rights reserved.
          </p>
          <p className="mt-2 text-sm text-on-brand-muted">
            Placeholder site. All copy is pending client confirmation.
          </p>
        </div>
      </Container>
    </footer>
  );
}
