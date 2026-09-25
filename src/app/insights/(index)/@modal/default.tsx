/**
 * The modal slot when nothing is intercepted: on /insights itself, on a
 * hard load, and after the browser goes back from an intercepted article.
 * Rendering nothing IS the closed state; the dialog only exists while an
 * article route is intercepted.
 */
export default function ModalDefault() {
  return null;
}
