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

/** Eyebrow + heading + intro, the standard opening of a page section. */
export type SectionIntro = {
  eyebrow: string;
  heading: string;
  intro: string;
};

/**
 * A numbered process, rendered by components/shared/ProcessTimeline.tsx.
 *
 * Both the Employers and the Job Seekers pages run one. They describe
 * different processes but share the shape, which is what makes the two
 * sections read as one site rather than two.
 */
export type ProcessStep = {
  id: string;
  /** Visible ordinal, aria-hidden: the <ol> already conveys the order. */
  number: string;
  title: string;
  summary: string;
  /**
   * What we do at this step. Optional, and currently unused: the site
   * publishes what the reader receives, not the mechanics behind it. The
   * column renders only when a step carries it and the labels name it.
   */
  weDo?: string[];
  /** What the reader receives or decides at this step. */
  youGet: string[];
};

export type ProcessCommitment = {
  id: string;
  title: string;
  detail: string;
};

export type ProcessContent = SectionIntro & {
  /** Column headings inside each step. `weDo` only when steps carry one. */
  labels: { weDo?: string; youGet: string };
  steps: ProcessStep[];
  /** Optional panel under the steps. Omit both and it is not rendered. */
  commitmentsHeading?: string;
  commitments?: ProcessCommitment[];
};

/** A closing call-to-action band. Rendered by components/ui/CtaBand.tsx. */
export type CtaBandContent = {
  heading: string;
  description: string;
  ctas: Cta[];
  /** Small reassurance line under the buttons. */
  footnote: string;
};
