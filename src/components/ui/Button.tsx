import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "inverse"
  | "outline-inverse";

/**
 * Every call to action on this site is a navigation link, so the base element
 * is <a>, not <button>. Nothing here removes the outline; the global
 * :focus-visible rule in globals.css provides the indicator.
 *
 * Contrast (all AA or better, see token comments in globals.css):
 *   primary         white on --color-brand ............ 11.2:1
 *   secondary       --color-brand on white ............ 11.2:1
 *   inverse         --color-brand on white ............ 11.2:1
 *   outline-inverse white on --color-surface-brand .... 11.2:1
 */
const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong border border-transparent",
  secondary:
    "bg-surface text-brand border border-border-strong hover:bg-brand-soft hover:border-brand",
  inverse: "bg-surface text-brand border border-transparent hover:bg-brand-soft",
  "outline-inverse":
    "bg-transparent text-on-brand border border-on-brand hover:bg-white/10",
};

/* Shared by the <button> and the <a>: identical geometry, identical focus
   behaviour. 44px minimum touch target (WCAG 2.5.5 / 2.5.8). */
const baseClass = [
  "inline-flex items-center justify-center gap-2",
  "rounded-md font-semibold no-underline",
  "transition-colors duration-150",
  "min-h-11",
].join(" ");

const sizeClass = {
  md: "px-5 py-3 text-base",
  lg: "px-6 py-3.5 text-lg",
} as const;

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  size?: keyof typeof sizeClass;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[baseClass, sizeClass[size], variantClass[variant], "disabled:opacity-70", className].join(" ")}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        baseClass,
        sizeClass[size],
        variantClass[variant],
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

/** Text link with a persistent underline, for inline and list contexts. */
export function TextLink({
  href,
  children,
  className = "",
  tone = "default",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "inverse";
}) {
  return (
    <Link
      href={href}
      className={[
        "font-semibold underline underline-offset-4 transition-colors",
        tone === "inverse"
          ? "text-on-brand decoration-on-brand-muted hover:decoration-on-brand"
          : "text-brand decoration-border-strong hover:text-brand-strong hover:decoration-brand",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
