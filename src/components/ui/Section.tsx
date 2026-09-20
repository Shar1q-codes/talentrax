import type { ReactNode } from "react";

import { Container } from "./Container";

type Tone = "default" | "muted" | "brand";

const toneClass: Record<Tone, string> = {
  default: "bg-surface text-ink",
  muted: "bg-surface-muted text-ink",
  // `on-brand` swaps the focus-ring colour to white for contrast (globals.css).
  brand: "bg-surface-brand text-on-brand on-brand",
};

/**
 * A full-width page band with vertical rhythm and a token-driven background.
 *
 * `labelledBy` wires the landmark to its own heading, so screen-reader users
 * get a meaningful region list instead of a row of unnamed "section" entries.
 */
export function Section({
  children,
  tone = "default",
  className = "",
  id,
  labelledBy,
  ariaLabel,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  id?: string;
  labelledBy?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={`${toneClass[tone]} py-16 sm:py-20 lg:py-24 ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** Standard eyebrow + h2 + intro block used at the top of most sections. */
export function SectionHeader({
  eyebrow,
  heading,
  intro,
  headingId,
  tone = "default",
  align = "left",
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  headingId: string;
  tone?: Tone;
  align?: "left" | "center";
}) {
  const isBrand = tone === "brand";
  const alignment =
    align === "center" ? "text-center mx-auto max-w-3xl" : "max-w-3xl";

  return (
    <div className={`${alignment} mb-12 lg:mb-16`}>
      {eyebrow ? (
        <p
          className={`mb-3 text-sm font-semibold tracking-widest uppercase ${
            isBrand ? "text-on-brand-muted" : "text-accent"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={headingId}
        className={`text-3xl font-bold tracking-tight sm:text-4xl ${
          isBrand ? "text-on-brand" : "text-ink"
        }`}
      >
        {heading}
      </h2>
      {intro ? (
        <p
          className={`mt-5 text-lg ${
            isBrand ? "text-on-brand-muted" : "text-ink-muted"
          }`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
