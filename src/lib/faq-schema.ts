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
 * The article pages use the item-based generator below for their own FAQ
 * sections, under the same rule.
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
  return faqPageJsonLdFromItems(groups.flatMap((group) => group.items));
}

/**
 * The shape both /faq items and an article's FAQ section satisfy. An
 * article answer is prose with link marks; only its text reaches the
 * markup, which is what the page shows.
 */
export type FaqLike = {
  question: string;
  /** Paragraphs, exactly as rendered. */
  answer: (string | { text: string })[];
};

/**
 * One FAQPage from a flat list of questions. This is what an article's FAQ
 * section uses (see app/insights/[slug]/page.tsx): the same rule applies
 * there, the markup is generated from the array the page renders, so it
 * cannot say anything the page does not.
 *
 * Callers pass a non-empty list. A FAQPage with no questions is a claim to
 * have an FAQ, so the article page emits nothing when there are none.
 */
export function faqPageJsonLdFromItems(items: FaqLike[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        // The visible answer, verbatim. Paragraph breaks become spaces:
        // the Answer text is a single string and this keeps it readable
        // rather than run together.
        text: item.answer
          .map((paragraph) => (typeof paragraph === "string" ? paragraph : paragraph.text))
          .join(" "),
      },
    })),
  };
}
