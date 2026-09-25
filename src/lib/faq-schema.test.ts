/**
 * Unit tests for the FAQPage structured data.
 *
 * The markup is generated from the array a page renders, so what matters is
 * that nothing is added, dropped or reordered on the way: an answer that
 * differs from the visible one is the FAQPage failure Google enforces.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { faqPageJsonLd, faqPageJsonLdFromItems } from "./faq-schema.ts";
import { fullArticle } from "./insights.fixture.ts";

describe("faqPageJsonLdFromItems", () => {
  const payload = faqPageJsonLdFromItems(fullArticle.faqs);
  const questions = payload.mainEntity as { name: string; acceptedAnswer: { text: string } }[];

  it("declares itself as schema.org FAQPage", () => {
    assert.equal(payload["@context"], "https://schema.org");
    assert.equal(payload["@type"], "FAQPage");
  });

  it("emits one Question per FAQ, in order, with the visible text", () => {
    assert.equal(questions.length, fullArticle.faqs.length);
    fullArticle.faqs.forEach((faq, index) => {
      assert.equal(questions[index].name, faq.question);
      assert.equal(
        questions[index].acceptedAnswer.text,
        faq.answer.map((paragraph) => paragraph.text).join(" "),
      );
    });
  });

  it("uses only the text of a rich answer, never its link marks", () => {
    assert.equal(JSON.stringify(payload).includes("href"), false);
  });

  it("joins answer paragraphs with a space rather than running them together", () => {
    assert.equal(
      questions[0].acceptedAnswer.text,
      "Yes. It has a second paragraph so the join is exercised.",
    );
  });

  it("serialises to JSON without throwing or losing a field", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  });
});

describe("faqPageJsonLd", () => {
  it("flattens groups into the same shape the item generator produces", () => {
    // /faq items carry plain-string answers; the article fixture's rich
    // answers are flattened to the same text here.
    const asItem = (id: string, index: number) => ({
      id,
      question: fullArticle.faqs[index].question,
      answer: fullArticle.faqs[index].answer.map((paragraph) => paragraph.text),
    });
    const grouped = faqPageJsonLd([
      { id: "a", heading: "A", intro: "", items: [asItem("q1", 0)] },
      { id: "b", heading: "B", intro: "", items: [asItem("q2", 1)] },
    ]);
    assert.deepEqual(grouped, faqPageJsonLdFromItems(fullArticle.faqs));
  });
});
