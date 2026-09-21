"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
 *
 * ONE SCROLL THRESHOLD, ONE CHANGE: the bottom border appears once the page
 * has scrolled. That is all. The header does not shrink, does not change
 * height, and does not hide itself on scroll down - a height change shifts
 * every page it sits on, and hiding the navigation to reclaim a strip of
 * screen is hostile to the person trying to use it.
 *
 * The border is present at every scroll position and only changes COLOUR, so
 * nothing reflows when it appears.
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

  /**
   * Whether the page has scrolled away from the top.
   *
   * Passive listener so it can never block scrolling, and the state is only
   * touched inside a requestAnimationFrame - a scroll handler that sets state
   * on every event is how a sticky header ends up janky.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(read);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-40 bg-surface",
        // Border-COLOUR only. The 1px is always there, so nothing moves.
        "border-b transition-colors",
        scrolled ? "border-border" : "border-transparent",
      ].join(" ")}
    >
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
                        "transition-colors",
                        isCurrent(item.href)
                          ? "text-brand"
                          : "text-ink-muted hover:text-brand active:text-brand-strong",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {/*
            Desktop utility actions. Renders nothing while utilityNav is
            empty, which it is: sign-in and registration are built but not
            wired, and a Sign in button that cannot sign anyone in reads as a
            broken site. See content/navigation.ts.
          */}
          {utilityNav.length > 0 ? (
            <div className="hidden items-center gap-3 lg:flex">
              {utilityNav.map((item) =>
                item.variant === "primary" ? (
                  <ButtonLink key={item.href} href={item.href} variant="primary">
                    {item.label}
                  </ButtonLink>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    className="inline-flex h-11 items-center rounded-md px-3 text-base font-medium text-ink-muted no-underline transition-colors hover:text-brand active:text-brand-strong"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          ) : null}

          {/* Mobile menu trigger */}
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted active:bg-brand-soft lg:hidden"
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
