import Link from "next/link";

import { site } from "@/content/site";

/**
 * Wordmark. IMAGE SLOT: the square mark is a token-coloured geometric
 * placeholder, not the client's real logo. When brand assets arrive, replace
 * the <svg> below (and only that) with the supplied artwork.
 *
 * The link's accessible name is the company name plus "home", so it is not
 * announced as a bare logo.
 */
export function Logo({ tone = "default" }: { tone?: "default" | "inverse" }) {
  const isInverse = tone === "inverse";

  return (
    <Link
      href="/"
      aria-label={`${site.name} - home`}
      className="inline-flex items-center gap-2.5 rounded-sm no-underline"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          width="32"
          height="32"
          rx="7"
          className={isInverse ? "fill-white" : "fill-brand"}
        />
        <path
          d="M9 10h14M16 10v13"
          stroke={isInverse ? "var(--color-brand)" : "var(--color-surface)"}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <path
          d="M20.5 22.5 24 19"
          stroke="var(--color-accent)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`text-lg font-bold tracking-tight ${
          isInverse ? "text-on-brand" : "text-ink"
        }`}
      >
        {site.name}
      </span>
    </Link>
  );
}
