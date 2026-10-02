import type { ReactNode } from "react";

/**
 * One plain sentence saying a form is built but not connected yet.
 *
 * In the page's own voice, not a banner: the account screens and the three
 * public forms say what the form cannot do before anyone fills it in. The
 * copy lives with each form (content/auth.ts `notOpenYet`, and `notOpen` in
 * content/upload-resume.ts, request-talent.ts and contact.ts), and goes in
 * the commit that wires that form.
 */
export function NotOpenNotice({
  children,
  className = "",
}: {
  children: ReactNode;
  /** Extra spacing where the notice sits outside a page header. */
  className?: string;
}) {
  return (
    <p className={`mt-6 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted ${className}`.trimEnd()}>
      {children}
    </p>
  );
}
