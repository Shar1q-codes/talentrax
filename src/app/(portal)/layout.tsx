import type { ReactNode } from "react";

/**
 * Candidate and employer authenticated areas. No pages yet.
 *
 * Nothing here may read the database directly: every query goes through a
 * feature's queries.ts (CLAUDE.md, "Feature boundaries").
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return children;
}
