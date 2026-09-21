import type { ReactNode } from "react";

/**
 * Neutral content surface. Uses a border rather than a shadow for separation
 * so the edge stays visible in high-contrast and forced-colours modes.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return (
    <Tag
      className={[
        "rounded-lg border border-border bg-surface p-6",
        "transition-colors",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}
