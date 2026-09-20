import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";
import { getComingSoonRoute } from "@/content/navigation";
import { buildMetadata } from "@/lib/metadata";

const route = getComingSoonRoute("/employers");

// noIndex: true -> robots { index: false, follow: true }. Crawlers still walk
// the navigation from here, but this placeholder page is not indexed.
export const metadata: Metadata = buildMetadata({
  title: route.title,
  description: route.description,
  path: route.href,
  noIndex: true,
});

export default function Page() {
  return <ComingSoon route={route} />;
}
