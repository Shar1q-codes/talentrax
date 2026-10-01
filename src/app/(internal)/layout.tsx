import type { ReactNode } from "react";

/**
 * The ATS, for staff roles. No pages yet.
 *
 * Nothing here may read the database directly: every query goes through a
 * feature's queries.ts (CLAUDE.md, "Feature boundaries").
 */
export default function InternalLayout({ children }: { children: ReactNode }) {
  return children;
}
