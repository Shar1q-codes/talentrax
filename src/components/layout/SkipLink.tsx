/**
 * Skip-to-content link (WCAG 2.1 AA - 2.4.1 Bypass Blocks).
 *
 * Visually hidden until focused, then pinned to the top-left above the sticky
 * header. It is the first focusable element in the document, so a keyboard
 * user's very first Tab offers a way past the navigation.
 *
 * Deliberately NOT `display: none` / `visibility: hidden` - those remove it
 * from the tab order entirely, which defeats the point.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={[
        "sr-only",
        "focus:not-sr-only",
        "focus:fixed focus:top-3 focus:left-3 focus:z-[60]",
        "focus:rounded-md focus:bg-surface focus:px-4 focus:py-3",
        "focus:text-base focus:font-semibold focus:text-brand",
        "focus:border focus:border-brand focus:shadow-lg",
      ].join(" ")}
    >
      Skip to main content
    </a>
  );
}
