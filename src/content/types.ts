/**
 * Content primitives shared by more than one content file.
 *
 * These used to live in content/home.ts, which made every other content file
 * import from the home page's copy to describe a button. They are structural,
 * not page copy, so they sit on their own.
 */

/**
 * Names in the inline icon set. The geometry lives in
 * src/components/ui/Icon.tsx; content data only ever carries the name, which
 * keeps every content file plain JSON when the CMS lands.
 */
export type IconName =
  | "handshake"
  | "clock"
  | "layers"
  | "briefcase"
  | "users"
  | "repeat"
  | "target"
  | "search"
  | "stethoscope"
  | "server"
  | "chart"
  | "check"
  | "alert";

export type Cta = {
  label: string;
  href: string;
  /**
   * Visual weight. Maps 1:1 to ButtonVariant in components/ui/Button.tsx.
   * The two `*-inverse` variants are for use on dark brand bands only.
   */
  variant: "primary" | "secondary" | "inverse" | "outline-inverse";
};

/** A closing call-to-action band. Rendered by components/ui/CtaBand.tsx. */
export type CtaBandContent = {
  heading: string;
  description: string;
  ctas: Cta[];
  /** Small reassurance line under the buttons. */
  footnote: string;
};
