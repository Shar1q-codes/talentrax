/**
 * The server-only public surface of this feature: for pages, server actions
 * and the proxy. Never imported by a client component; the index is for
 * those.
 */

export { getStaffAccess, refreshStaffSession, staffPathFor, type StaffAccess } from "./queries.server";
