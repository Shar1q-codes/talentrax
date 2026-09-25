"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";

import type { IconName, RailControls } from "@/content/types";

import { Icon } from "./Icon";

/**
 * Drift speed. Slow enough to read as drift rather than as motion asking for
 * attention. Applied per millisecond of frame time, not per frame, so it is
 * the same on a 60Hz and a 120Hz display.
 */
export const DRIFT_PX_PER_SECOND = 35;

/**
 * Longest frame the drift will integrate. A frame this late means the main
 * thread stalled; covering the whole gap in one step would read as a jump.
 */
const MAX_FRAME_MS = 100;

/**
 * How far scrollLeft may sit from the value the rail last wrote and still be
 * its own write. The browser rounds a written offset to the device pixel
 * grid - up to 1px at DPR 1 - and anything past that was not us.
 */
const OWN_WRITE_TOLERANCE_PX = 1;

/**
 * An infinite horizontal rail: native overflow-x, three identical sets of
 * items, a continuous drift, and previous/next/pause buttons.
 *
 * THREE SETS, ONE REAL. The caller renders its items three times. The first
 * and third sets carry `data-rail-copy`, aria-hidden, links at tabIndex -1,
 * and are display:none until this rail sets `data-infinite` on hydration -
 * so the server HTML shows one set, and Tab reaches each link once.
 * `inert` is not used: it would make a copy card under the pointer ignore
 * a click.
 *
 * THE INVARIANT: scrollLeft stays within the middle set's span,
 * [setWidth, 2 x setWidth). Every frame of the drift reads scrollLeft, adds
 * speed x elapsed, and recentres by one set width if it has left that span,
 * either way. All three sets are identical, so the recentre is invisible,
 * and there is no start or end to reach. setWidth is measured live from
 * layout each frame - the distance from the first item of set one to the
 * first item of set two - never cached. getBoundingClientRect rather than
 * offsetLeft, because offsetLeft rounds to whole pixels and the card
 * widths are percentages (at 1000px a set is 2486.44px).
 *
 * The rail parks at setWidth when the sets first appear and whenever its
 * width changes. A user scroll that comes to rest outside the span
 * (scrollend) is recentred the same way - after a hard swipe to the left,
 * for instance. The one exception is keyboard focus inside the rail: a
 * recentre could put the focused card off-screen, so it waits until focus
 * leaves.
 *
 * NO POSITION STATE. The rail's live scrollLeft is the only truth. Two
 * things carry between frames, and neither is a position:
 *
 *   - `writtenRef`, the value the rail last wrote, as the browser read it
 *     back. It exists only to tell the rail's own scroll events from the
 *     user's: anything more than 1px away was the user, and pauses.
 *   - `carry`, the sub-pixel part of a frame's step the browser rounded
 *     away (under 1px). At DPR 1 scrollLeft is whole pixels; a 0.6px step
 *     re-read each frame would round to 0 or 1 and the speed would depend
 *     on the refresh rate. Reset whenever the user moves the rail.
 *
 * NO VISIBLE SCROLLBAR (`.scrollbar-hidden`). A native scrollbar shows a
 * finite range for content that has none, and its thumb jumps on every
 * recentre although the cards do not move. The rail still scrolls by
 * touch, wheel, trackpad and keyboard; the previous/next buttons are the
 * visible manual control. They move by one card, never disable - there is
 * no end - and pause the drift like any other manual scroll.
 *
 * SNAP is off whenever the rail drifts: snap and continuous motion fight,
 * and switching snap on at a press made the browser snap the rail away
 * from where the user put it. On under reduced motion, where nothing
 * drifts.
 *
 * FOCUS. Browsers do not scroll a focused element that is already partly
 * visible, which is exactly the card peeking at the edge. So focus inside
 * an item brings the whole item into view (`inline: "nearest"`). The region
 * itself takes focus (tabIndex 0, named by `label`) so the arrow keys
 * scroll it.
 *
 * Every one of these stops the frame loop outright (cancelAnimationFrame),
 * and a resume carries on from wherever the rail is, in the same direction:
 *
 *   - the pause button (WCAG 2.2.2): a real <button>, icon-only, named by
 *     aria-label for what it will do. Once pressed it stays paused.
 *   - a mouse or pen moving over the rail. A pointer the page scrolled
 *     underneath, without the user moving it, does not count.
 *   - keyboard focus inside the rail (:focus-visible);
 *   - a manual scroll: a press, a sideways wheel or trackpad swipe, the
 *     previous/next buttons, or any scroll the rail did not write. A
 *     vertical wheel is the page scrolling. Held until the pointer or
 *     focus leaves the whole control (header row and rail), or the rail
 *     leaves the viewport;
 *   - a touch on the rail or on previous/next, held until the rail has
 *     been scrolled out of the viewport - a finger has no "leave";
 *   - the rail being off-screen, or the tab hidden (visibilitychange).
 *
 * Under prefers-reduced-motion: reduce the drift never starts and the
 * pause button is hidden. The rail is still infinite, and previous/next
 * move instantly rather than smoothly.
 *
 * HEADER ROW. `header` on the left; `actions`, previous, next and pause on
 * the right, in that tab order, all before the rail they control.
 */
export function ScrollRail({
  label,
  controls,
  header,
  actions,
  itemSelector = "li",
  copySelector = "[data-rail-copy]",
  children,
}: {
  label: string;
  controls: RailControls;
  header?: ReactNode;
  actions?: ReactNode;
  itemSelector?: string;
  copySelector?: string;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  /**
   * The scrollLeft the rail last wrote, as the browser read it back. Used
   * only to tell the rail's own scroll events from the user's.
   */
  const writtenRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [touched, setTouched] = useState(false);
  const [inView, setInView] = useState(false);

  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const motionAllowed = useSyncExternalStore(
    subscribeReducedMotion,
    () => !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );

  /** The copies are shown: the rail is infinite. Motion or not. */
  const infinite = hydrated;
  const drifts = infinite && motionAllowed;
  const running =
    drifts &&
    playing &&
    tabVisible &&
    inView &&
    !hovered &&
    !focused &&
    !engaged &&
    !touched;

  /** Write a scrollLeft and remember it, so its scroll event reads as ours. */
  function write(rail: HTMLElement, x: number) {
    rail.scrollLeft = x;
    writtenRef.current = rail.scrollLeft;
  }

  /** Recentre into the middle set, onto identical content, if outside it. */
  function recentre(rail: HTMLElement) {
    const setWidth = measureSetWidth(rail, itemSelector, copySelector);
    if (setWidth === null) return;
    const x = rail.scrollLeft;
    const target = intoMiddleSet(x, setWidth);
    if (target !== x) write(rail, target);
  }

  // Park in the middle set when the sets first appear and whenever the
  // rail's width changes. Not while keyboard focus is inside: that would
  // move the focused card.
  useEffect(() => {
    const rail = railRef.current;
    if (!infinite || !rail) return;
    let width = -1;
    const observer = new ResizeObserver(() => {
      if (rail.clientWidth === width) return;
      width = rail.clientWidth;
      if (rail.contains(document.activeElement)) return;
      const setWidth = measureSetWidth(rail, itemSelector, copySelector);
      if (setWidth !== null) write(rail, setWidth);
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [infinite, itemSelector, copySelector]);

  // Visibility of the rail itself. Leaving the viewport also ends a touch
  // hold - the only "leave" a finger has - and a manual-scroll hold.
  useEffect(() => {
    const rail = railRef.current;
    if (!drifts || !rail) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (!entry.isIntersecting) {
        setTouched(false);
        setEngaged(false);
      }
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [drifts]);

  // The drift. Keyed on `running` alone (the selectors are constant): a
  // pause or resume stops or starts it, and a restart re-reads everything
  // from the live rail, because nothing here is captured to go stale.
  useEffect(() => {
    const rail = railRef.current;
    if (!running || !rail) return;

    writtenRef.current = rail.scrollLeft;
    let carry = 0;
    let last: number | null = null;
    let frame = 0;

    const tick = (now: number) => {
      const actual = rail.scrollLeft;
      if (!isOwnWrite(actual, writtenRef.current)) {
        // The user moved it. Write nothing; the scroll listener pauses.
        carry = 0;
      } else if (last !== null) {
        const setWidth = measureSetWidth(rail, itemSelector, copySelector);
        if (setWidth !== null) {
          const elapsed = Math.min(now - last, MAX_FRAME_MS);
          const target = intoMiddleSet(
            actual + carry + (DRIFT_PX_PER_SECOND * elapsed) / 1000,
            setWidth,
          );
          rail.scrollLeft = target;
          writtenRef.current = rail.scrollLeft;
          carry = target - writtenRef.current;
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, itemSelector, copySelector]);

  function onScroll() {
    const rail = railRef.current;
    if (!infinite || !rail) return;
    if (!isOwnWrite(rail.scrollLeft, writtenRef.current)) setEngaged(true);
  }

  function onScrollEnd() {
    const rail = railRef.current;
    if (!infinite || !rail || focused) return;
    if (!isOwnWrite(rail.scrollLeft, writtenRef.current)) recentre(rail);
  }

  /** Previous or next: one card's pitch, from wherever the rail is now. */
  function nudge(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    setEngaged(true);
    const pitch = measurePitch(rail, itemSelector, copySelector);
    if (pitch === null) return;
    // If the move would leave the middle set, recentre first - invisibly,
    // onto identical content - so there is always room. No end to reach.
    const setWidth = measureSetWidth(rail, itemSelector, copySelector);
    if (setWidth !== null) {
      const x = rail.scrollLeft;
      const shifted =
        intoMiddleSet(x + direction * pitch, setWidth) - direction * pitch;
      if (Math.abs(shifted - x) > OWN_WRITE_TOLERANCE_PX) {
        rail.scrollLeft = shifted;
      }
    }
    rail.scrollBy({
      left: direction * pitch,
      behavior: motionAllowed ? "smooth" : "auto",
    });
  }

  function revealFocusedItem(event: FocusEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;
    // Keyboard focus only. A mouse press also focuses the region; that is
    // the press latch's job, which releases when the pointer leaves.
    if (event.target.matches(":focus-visible")) setFocused(true);
    const item = event.target.closest(itemSelector);
    if (item && event.currentTarget.contains(item)) {
      item.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function releaseRailFocus(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFocused(false);
    // The recentre that waited for focus to leave.
    if (infinite) recentre(event.currentTarget);
  }

  /** Focus has left the whole control: the manual hold ends. */
  function releaseControl(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setEngaged(false);
  }

  function onControlPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    setHovered(false);
    setEngaged(false);
  }

  function onRailPointerMove(event: PointerEvent<HTMLDivElement>) {
    // Zero movement is the browser re-hit-testing a pointer the page
    // scrolled under, not a person moving the mouse onto the rail.
    if (event.pointerType === "touch") return;
    if (event.movementX !== 0 || event.movementY !== 0) setHovered(true);
  }

  function onRailPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") setHovered(false);
  }

  function onRailPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") setTouched(true);
    else setEngaged(true);
  }

  function onArrowPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch") setTouched(true);
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      setEngaged(true);
    }
  }

  return (
    <div onPointerLeave={onControlPointerLeave} onBlur={releaseControl}>
      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-16">
        {header}
        <div className="flex shrink-0 items-center gap-3">
          {actions}
          <ControlButton
            icon="chevron-left"
            label={controls.previousLabel}
            onClick={() => nudge(-1)}
            onPointerDown={onArrowPointerDown}
          />
          <ControlButton
            icon="chevron-right"
            label={controls.nextLabel}
            onClick={() => nudge(1)}
            onPointerDown={onArrowPointerDown}
          />
          <ControlButton
            icon={playing ? "pause" : "play"}
            label={playing ? controls.pauseLabel : controls.playLabel}
            onClick={() => setPlaying(!playing)}
            // Nothing moves under reduced motion, so there is nothing to pause.
            className="motion-reduce:hidden"
          />
        </div>
      </div>

      <div
        ref={railRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        data-infinite={infinite ? "" : undefined}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        onFocus={revealFocusedItem}
        onBlur={releaseRailFocus}
        onPointerMove={onRailPointerMove}
        onPointerLeave={onRailPointerLeave}
        onPointerDown={onRailPointerDown}
        onWheel={onWheel}
        className={`${drifts ? "snap-none" : "snap-x snap-mandatory"} scrollbar-hidden overflow-x-auto overscroll-x-contain`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The rail's icon-only buttons. Quiet: no fill, a control-grade outline
 * (border-control, 4.3:1 on surface-muted - over the 3:1 of 1.4.11) and an
 * ink-muted glyph (6.9:1). Hover and press darken it; the global
 * :focus-visible ring is untouched. Always visible - a hover-only control
 * does not exist on a touch screen. The glyph is aria-hidden; the name is
 * the aria-label.
 */
function ControlButton({
  icon,
  label,
  onClick,
  onPointerDown,
  className = "",
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-control text-ink-muted hover:bg-surface hover:text-ink ${className}`}
    >
      <Icon name={icon} className="h-5 w-5" />
    </button>
  );
}

/**
 * One set's width, from live layout: the first item of set one to the first
 * item of set two (the real set). That includes the gap after the last card
 * of set one. Unrounded - see the component comment.
 */
function measureSetWidth(
  rail: HTMLElement,
  itemSelector: string,
  copySelector: string,
): number | null {
  const firstOfSetOne = rail.querySelector<HTMLElement>(itemSelector);
  const firstOfSetTwo = rail.querySelector<HTMLElement>(
    `${itemSelector}:not(${copySelector})`,
  );
  if (!firstOfSetOne || !firstOfSetTwo || firstOfSetOne === firstOfSetTwo) {
    return null;
  }
  const setWidth =
    firstOfSetTwo.getBoundingClientRect().left -
    firstOfSetOne.getBoundingClientRect().left;
  return setWidth > 0 ? setWidth : null;
}

/** One card's pitch, card plus gap, from live layout. */
function measurePitch(
  rail: HTMLElement,
  itemSelector: string,
  copySelector: string,
): number | null {
  const [a, b] = rail.querySelectorAll<HTMLElement>(
    `${itemSelector}:not(${copySelector})`,
  );
  if (!a || !b) return null;
  const pitch = b.getBoundingClientRect().left - a.getBoundingClientRect().left;
  return pitch > 0 ? pitch : null;
}

/** Into [setWidth, 2 x setWidth): the middle set, onto identical content. */
function intoMiddleSet(x: number, setWidth: number): number {
  if (x >= 2 * setWidth) return x - setWidth;
  if (x < setWidth) return x + setWidth;
  return x;
}

function isOwnWrite(actual: number, written: number | null): boolean {
  return written !== null && Math.abs(actual - written) <= OWN_WRITE_TOLERANCE_PX;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeNothing() {
  return () => {};
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
