"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { primaryNav, utilityNav } from "@/content/navigation";
import { site } from "@/content/site";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Slide-in navigation drawer for small viewports.
 *
 * Accessibility contract:
 *   - role="dialog" + aria-modal, labelled by its own heading
 *   - focus moves into the dialog on open and returns to the trigger on close
 *   - Tab and Shift+Tab are trapped inside while open
 *   - Escape closes
 *   - the page behind is inert to scroll and hidden from assistive tech
 *   - each nav group is a disclosure (button + aria-expanded + list)
 *
 * The slide transition is a CSS transform, and the global reduced-motion rule
 * in globals.css collapses its duration for users who ask for less motion.
 */
export function MobileDrawer({
  open,
  onClose,
  triggerRef,
  isCurrent,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isCurrent: (href: string) => boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Move focus in on open; restore it to the trigger on close. */
  useEffect(() => {
    if (!open) return;
    // Capture both targets now rather than reading the ref during cleanup:
    // by then it may point at a different node (or none).
    const trigger = triggerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      (trigger ?? previouslyFocused)?.focus();
    };
  }, [open, triggerRef]);

  /**
   * Lock background scroll while the drawer is open.
   *
   * The lock has to be RELEASABLE SYNCHRONOUSLY, which is why the previous
   * value lives in a ref rather than in a closure. Tapping a link in the
   * drawer closes it and navigates on the same click, and React runs this
   * cleanup as a passive effect - while the App Router resets scroll in the
   * layout phase, which is earlier. The router would be trying to reset the
   * scroll position of a document that still had `overflow: hidden` on it,
   * and the new page would open at the old page's offset.
   *
   * closeForNavigation() releases the lock before either of those runs.
   */
  const lockedOverflowRef = useRef<string | null>(null);

  const releaseScrollLock = useCallback(() => {
    if (lockedOverflowRef.current === null) return;
    document.body.style.overflow = lockedOverflowRef.current;
    lockedOverflowRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    lockedOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return releaseScrollLock;
  }, [open, releaseScrollLock]);

  /**
   * Closing because the reader is navigating away, rather than dismissing.
   * Every link in the drawer uses this; Escape, the scrim and the close
   * button use onClose directly, because nothing is navigating then.
   */
  const closeForNavigation = useCallback(() => {
    releaseScrollLock();
    onClose();
  }, [releaseScrollLock, onClose]);

  /* Escape to close, Tab/Shift+Tab trapped inside the dialog. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    // `inert` (React 19) removes the closed drawer from the tab order and the
    // accessibility tree. Without it the links stay focusable while hidden,
    // which strands keyboard users in an off-screen panel.
    <div
      className={`lg:hidden ${open ? "" : "pointer-events-none"}`}
      inert={!open}
    >
      {/* Scrim. Click closes; it is not a focus target, Escape and the
          close button are the accessible routes out. */}
      <div
        onClick={onClose}
        // Opacity only, at the same duration as the panel, so the scrim and
        // the drawer read as one movement rather than two.
        className={`fixed inset-0 z-40 bg-ink/50 transition-opacity duration-[var(--duration-medium)] ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-drawer-heading"
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col",
          "border-l border-border bg-surface shadow-xl",
          // Transform only: nothing here runs layout on a frame. Escape sets
          // open=false and focus returns to the trigger immediately; the
          // slide-out is never waited on.
          "transition-transform duration-[var(--duration-medium)]",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2
            id="mobile-drawer-heading"
            className="text-base font-bold text-ink"
          >
            Menu
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink active:bg-brand-soft"
          >
            <span className="sr-only">Close menu</span>
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav
          aria-label="Primary (mobile)"
          className="flex-1 overflow-y-auto overscroll-contain px-2 py-4"
        >
          <ul className="flex flex-col gap-1">
            {primaryNav.map((item) => {
              if (!item.children) {
                const current = isCurrent(item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={closeForNavigation}
                      aria-current={current ? "page" : undefined}
                      className={`block rounded-md px-3 py-3 text-base font-semibold no-underline ${
                        current
                          ? "bg-brand-soft text-brand"
                          : "text-ink hover:bg-surface-muted active:bg-brand-soft"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              const isOpen = expanded === item.id;
              const listId = `${item.id}-mobile-list`;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-base font-semibold text-ink transition-colors hover:bg-surface-muted active:bg-brand-soft"
                  >
                    {item.label}
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-5 w-5 shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <ul
                    id={listId}
                    hidden={!isOpen}
                    className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-border pl-3"
                  >
                    {item.children.map((child) => {
                      const current = isCurrent(child.href);
                      return (
                        <li key={`${child.href}-${child.label}`}>
                          <Link
                            href={child.href}
                            onClick={closeForNavigation}
                            aria-current={current ? "page" : undefined}
                            className={`block rounded-md px-3 py-2.5 text-base no-underline ${
                              current
                                ? "bg-brand-soft font-semibold text-brand"
                                : "text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-brand-soft"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>

        {/*
          The whole block goes when there is nothing to put in it: an empty
          bordered strip at the bottom of the drawer is worse than no strip.
          utilityNav is empty while sign-in is unwired - see
          content/navigation.ts.
        */}
        <div
          className={
            utilityNav.length > 0 ||
            (site.contact.phone.href && !site.contact.phone.isPlaceholder)
              ? "border-t border-border px-4 py-4"
              : "hidden"
          }
        >
          <div className="flex flex-col gap-3">
            {utilityNav.map((item) =>
              item.variant === "primary" ? (
                <ButtonLink
                  key={item.href}
                  href={item.href}
                  variant="primary"
                  onClick={closeForNavigation}
                >
                  {item.label}
                </ButtonLink>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeForNavigation}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-control px-5 py-3 text-base font-semibold text-brand no-underline transition-colors hover:bg-brand-soft"
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>
          {/*
            Rendered only once a real number exists. The 555 placeholder in
            content/site.ts is a reserved fictional number, and the drawer is
            in the DOM on every page - publishing an invented phone number
            site-wide is the same mistake as a bracketed placeholder (rule 6).
          */}
          {site.contact.phone.href && !site.contact.phone.isPlaceholder ? (
            <p className="mt-4 text-sm text-ink-muted">
              <a
                href={site.contact.phone.href}
                className="font-semibold text-brand underline underline-offset-4"
              >
                {site.contact.phone.display}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
