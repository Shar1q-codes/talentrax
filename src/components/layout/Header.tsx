"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { NavDropdown } from "@/components/layout/NavDropdown";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { primaryNav, utilityNav } from "@/content/navigation";

/**
 * Sticky site header. Renders the primary nav by mapping over `primaryNav`
 * from content/navigation.ts - adding a link is a data edit, not a change
 * here.
 *
 * This is a client component because the dropdowns and drawer hold open/close
 * state and read the current pathname. The page content around it stays a
 * server component.
 */
export function Header() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  /** Exact match only: "/employers" must not mark "/employers/services". */
  const isCurrent = useCallback(
    (href: string) => pathname === href,
    [pathname],
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <Logo />

          {/* Desktop primary navigation */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) =>
                item.children ? (
                  <NavDropdown
                    key={item.id}
                    item={item}
                    isCurrent={isCurrent}
                  />
                ) : (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isCurrent(item.href) ? "page" : undefined}
                      className={[
                        "inline-flex h-11 items-center rounded-md px-3 text-base font-medium no-underline",
                        "transition-colors duration-150",
                        isCurrent(item.href)
                          ? "text-brand"
                          : "text-ink-muted hover:text-brand",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {/* Desktop utility actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={utilityNav.signIn.href}
              aria-current={
                isCurrent(utilityNav.signIn.href) ? "page" : undefined
              }
              className="inline-flex h-11 items-center rounded-md px-3 text-base font-medium text-ink-muted no-underline transition-colors hover:text-brand"
            >
              {utilityNav.signIn.label}
            </Link>
            <ButtonLink href={utilityNav.register.href} variant="primary">
              {utilityNav.register.label}
            </ButtonLink>
          </div>

          {/* Mobile menu trigger */}
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted lg:hidden"
          >
            <span className="sr-only">Open menu</span>
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </Container>

      <div id="mobile-navigation-drawer">
        <MobileDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          triggerRef={menuButtonRef}
          isCurrent={isCurrent}
        />
      </div>
    </header>
  );
}
