import type { ReactNode } from "react";

/**
 * Horizontal layout shell. Mobile-first: a 16px side gutter at every width
 * below `sm`, widening on larger viewports. Everything on the page routes
 * through this so the gutter is defined in exactly one place.
 */
export function Container({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "header" | "footer" | "section" | "nav";
}) {
  return (
    <Tag className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </Tag>
  );
}
