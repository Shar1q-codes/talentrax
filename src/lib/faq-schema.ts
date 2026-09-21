/**
 * schema.org FAQPage generator.
 *
 * Built from the same array the page renders, so the markup and the visible
 * answers cannot disagree - which is the rule Google actually enforces on
 * FAQPage, and the way most implementations get it wrong.
 *
 * Unlike the JobPosting generator, there is no risk of publishing something
 * untrue here: every answer is content that already exists elsewhere on this
 * site. The markup restates it, it does not assert anything new.
 *
 * Type-only imports, so this module has no runtime dependencies.
 */

import type { FaqGroup } from "@/content/faq";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type FaqPageJsonLd = Record<string, JsonLdValue>;

/**
 * Flattens every group into one FAQPage.
 *
 * schema.org has no notion of question groups, so the employer and candidate
 * sections collapse into a single mainEntity list. The page keeps the
 * headings; the markup does not need them.
 */
export function faqPageJsonLd(groups: FaqGroup[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          // The visible answer, verbatim. Paragraph breaks become spaces:
          // the Answer text is a single string and this keeps it readable
          // rather than run together.
          text: item.answer.join(" "),
        },
      })),
    ),
  };
}
