import { Button } from "@/components/ui/Button";
import { staffHome } from "@/content/staff";
import { staffSignOutAction } from "../actions";

/**
 * A real form, so signing out works before any JavaScript has loaded. Also
 * the way out part-way through sign-in ("use a different account").
 */
export function StaffSignOutButton({ label = staffHome.signOut }: { label?: string }) {
  return (
    <form action={staffSignOutAction}>
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
