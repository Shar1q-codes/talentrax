"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "@/content/navigation";

/**
 * Desktop primary-nav dropdown.
 *
 * ARIA pattern: disclosure (button + region), NOT menu/menuitem. The panel
 * contains ordinary navigation links, and menu roles would make screen
 * readers announce them as application menu commands and suppress the normal
 * link-reading behaviour.
 *
 * Keyboard contract:
 *   Enter / Space   toggle the panel
 *   ArrowDown       open and move focus to the first link
 *   ArrowUp/Down    move between links while open
 *   Home / End      jump to first / last link
 *   Escape          close and return focus to the trigger
 *   Tab             leaving the group closes it
 *
 * Pointer users additionally get hover-to-open; hover is never the only way
 * in, so keyboard and touch users are unaffected.
 */
export function NavDropdown({
  item,
  isCurrent,
}: {
  item: NavItem;
  isCurrent: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = `${item.id}-panel`;
  const reactId = useId();
  const triggerId = `${item.id}-trigger-${reactId}`;

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  /* Close on outside pointer press. */
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const links = () =>
    Array.from(
      panelRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
    );

  function focusLinkAt(index: number) {
    const all = links();
    if (all.length === 0) return;
    const next = (index + all.length) % all.length;
    all[next]?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      // Wait for the panel to mount before moving focus into it.
      requestAnimationFrame(() => focusLinkAt(0));
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  }

  function onPanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const all = links();
    const currentIndex = all.indexOf(document.activeElement as HTMLAnchorElement);

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "ArrowDown":
        event.preventDefault();
        focusLinkAt(currentIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusLinkAt(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusLinkAt(0);
        break;
      case "End":
        event.preventDefault();
        focusLinkAt(all.length - 1);
        break;
      default:
        break;
    }
  }

  /* Tabbing (or clicking) out of the group closes it. */
  function onBlurCapture(event: React.FocusEvent<HTMLLIElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && wrapperRef.current?.contains(next)) return;
    setOpen(false);
  }

  const sectionIsCurrent =
    isCurrent(item.href) ||
    (item.children ?? []).some((child) => isCurrent(child.href));

  return (
    <li
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlurCapture={onBlurCapture}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        className={[
          "inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-base font-medium",
          "transition-colors duration-150",
          sectionIsCurrent
            ? "text-brand"
            : "text-ink-muted hover:text-brand",
        ].join(" ")}
      >
        {item.label}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform duration-150 ${
            open ? "rotate-180" : ""
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

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          aria-labelledby={triggerId}
          onKeyDown={onPanelKeyDown}
          className={[
            "absolute left-0 top-full z-50 w-80 pt-2",
          ].join(" ")}
        >
          <ul className="rounded-lg border border-border bg-surface p-2 shadow-lg">
            {item.children?.map((child) => {
              const current = isCurrent(child.href);
              return (
                <li key={`${child.href}-${child.label}`}>
                  <Link
                    href={child.href}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={[
                      "block rounded-md px-3 py-2.5 no-underline transition-colors",
                      current
                        ? "bg-brand-soft text-brand"
                        : "text-ink hover:bg-surface-muted",
                    ].join(" ")}
                  >
                    <span className="block text-base font-semibold">
                      {child.label}
                    </span>
                    {child.description ? (
                      <span className="mt-0.5 block text-sm text-ink-muted">
                        {child.description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
