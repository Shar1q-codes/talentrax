"use client";

import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { articleDetail, INSIGHTS_PATH } from "@/content/insights";

/**
 * The article dialog, mounted by the intercepted route at
 * app/(marketing)/insights/(index)/@modal/(.)[slug]. It exists only while that route is
 * active: opening is mounting, closing is `router.back()`, which pops the
 * history entry the interception pushed and unmounts this component.
 *
 * A NATIVE <dialog>, opened with showModal(). That gives the dialog
 * semantics for free and gets them right: role="dialog" and aria-modal,
 * focus held inside (the top layer traps Tab and Shift+Tab), Escape
 * closing through the cancel event, and everything outside the dialog
 * inert to pointer, keyboard and assistive technology while it is open.
 * The frame is styled by `.article-modal` in globals.css: a full-screen
 * sheet below the small breakpoint, a centred panel above it.
 *
 * THE SCROLL LOCK RELEASES IN THE SAME COMMIT THAT REMOVES THE DIALOG.
 * The body's overflow is set and restored in a LAYOUT effect, whose
 * cleanup runs synchronously while React commits the removal - before the
 * App Router resets or restores scroll in its own layout effect. The
 * mobile drawer once used a passive effect for the same lock, and the
 * router scrolled a document that was still locked, so every navigation
 * out of it opened the next page at the old offset. Back, a link inside
 * the dialog, the close button and Escape all pass through this cleanup,
 * and there is no other path out.
 *
 * FOCUS RETURNS TO WHAT OPENED THE DIALOG, on every way out: Escape, the
 * close button, the backdrop and the browser's back button. The element
 * focused when the dialog mounted is stored; the card link found by href is
 * the fallback (Safari does not focus a link on click). The index page stays
 * mounted underneath, so it is still there, and it is focused without
 * scrolling: the list keeps its scroll position and the card was in view
 * when it was opened. If the exit was a navigation to another page the card
 * is gone and nothing is focused, which is the right outcome.
 *
 * The dialog is CLOSED before focus moves. React runs this unmount cleanup
 * before it removes the dialog from the DOM, so the dialog is still open and
 * modal when the cleanup runs - and everything outside an open modal dialog
 * is inert, so a focus() on the card silently did nothing. Focus fell to
 * <body>, and the next Tab went to the footer.
 *
 * A RELOAD STARTS AT THE ARTICLE. Opening pushes a history entry for the
 * article URL while the document is the index, scrolled wherever the list
 * was. A reload of that entry is a direct load of the full article page, and
 * the browser restored the index's scroll offset onto it, mid-article. The
 * entry's scroll restoration is set to manual, which is a property of that
 * one history entry: the index's own entry keeps the browser's restoration,
 * so back still returns to the list where it was.
 *
 * Motion is transform and opacity, on the tokens, and is set in CSS. The
 * global reduced-motion rule collapses it to nothing.
 */
export function ArticleModal({
  slug,
  titleId,
  children,
}: {
  slug: string;
  /** id of the heading that labels the dialog; rendered by the caller. */
  titleId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const slugRef = useRef(slug);
  const leavingRef = useRef(false);
  /** The element focused when the dialog opened: the card, normally. */
  const openerRef = useRef<HTMLElement | null>(null);
  /** The article the dialog opened on, for the by-href fallback. */

  useLayoutEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  /**
   * One exit for every way out that is not a link: the close button, the
   * backdrop, Escape and a browser-forced close all end here, exactly once.
   */
  const close = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    router.back();
  }, [router]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // The slug this dialog opened on: the fallback target if the opener is
    // gone by the time it closes.
    const openedSlug = slugRef.current;
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;

    if (!dialog.open) dialog.showModal();
    history.scrollRestoration = "manual";

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      // Still open at this point (see the header). Close it first, or the
      // focus below lands on nothing. Mark the exit taken, so the close
      // event cannot start a second router.back() after a browser Back.
      leavingRef.current = true;
      if (dialog.open) dialog.close();
      const opener = openerRef.current;
      const target =
        opener && opener.isConnected
          ? opener
          : document.querySelector<HTMLElement>(
              `a[href="${INSIGHTS_PATH}/${openedSlug}"]`,
            );
      target?.focus({ preventScroll: true });
    };
  }, []);

  /**
   * On open, and again when a related-reading link inside the dialog swaps
   * the article (the same interception, so the same dialog instance): start
   * at the top, with focus on the close control. showModal() has already
   * run by the time this effect does, so the button is focusable.
   */
  useLayoutEffect(() => {
    dialogRef.current?.scrollTo({ top: 0 });
    closeButtonRef.current?.focus();
  }, [slug]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="article-modal"
      // Escape. Preventing the default keeps the dialog open until the
      // navigation unmounts it, so nothing flashes closed-then-gone.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      // A close the browser forced anyway (Chrome ignores a prevented
      // cancel on a repeated Escape): follow it with the navigation rather
      // than leave a closed dialog under an article URL.
      onClose={close}
      // A click on the backdrop reaches the dialog element itself; a click
      // on the content reaches its children.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="article-modal-bar sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-8">
        <p className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
          {articleDetail.eyebrow}
        </p>
        <div className="flex items-center gap-3">
          {/* A plain anchor on purpose: a full load, so it lands on the
              full page rather than being intercepted again. */}
          <a
            href={`${INSIGHTS_PATH}/${slug}`}
            className="link-inline text-sm"
          >
            {articleDetail.openPageLabel}
          </a>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="pressable inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink active:bg-brand-soft"
          >
            <span className="sr-only">{articleDetail.closeLabel}</span>
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
      </div>

      <div className="px-4 py-8 sm:px-8 sm:py-10">{children}</div>
    </dialog>
  );
}
