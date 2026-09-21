import { CtaBand } from "@/components/ui/CtaBand";
import { closingCta } from "@/content/home";

/** The home page's closing band. Layout lives in components/ui/CtaBand.tsx. */
export function ClosingCta() {
  return <CtaBand content={closingCta} headingId="closing-cta-heading" />;
}
