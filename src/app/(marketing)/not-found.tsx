import { NotFoundContent } from "@/components/layout/NotFoundContent";

/**
 * notFound() thrown by a public route: an unknown job, an unknown article.
 * It renders inside the (marketing) layout, which already draws the chrome,
 * so this is the body alone. The page that threw sets the title.
 */
export default function MarketingNotFound() {
  return <NotFoundContent />;
}
