import type { ReactNode } from "react";

import { StaffChrome } from "@/components/layout/StaffChrome";

/**
 * The ATS, for staff roles: /staff and its sign-in steps.
 *
 * NOT A GUARD. A layout does not re-run on every navigation and does not stop
 * a page or a server action from running, so every staff page and action
 * asks getStaffAccess() itself (features/auth/queries.server.ts).
 *
 * Nothing here may read the database directly: every query goes through a
 * feature's queries.ts or queries.server.ts (CLAUDE.md, "Feature boundaries").
 */
export default function InternalLayout({ children }: { children: ReactNode }) {
  return <StaffChrome>{children}</StaffChrome>;
}
