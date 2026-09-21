import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import type { LegalDocumentContent, LegalSection } from "@/content/legal";

/**
 * Long-form legal document: masthead, an in-page contents list, then one
 * <section> per heading.
 *
 * Measure is capped at max-w-3xl and the type scale is the body scale, not a
 * smaller "legal text" size. A privacy policy set in 12px is a privacy policy
 * nobody reads, which rather defeats it.
 *
 * RULE 5 IS ENFORCED HERE, not just observed in the data: a section with no
 * blocks renders nothing at all, heading included, and is left out of the
 * contents list too. The content file omits those sections outright and says
 * why in a comment - this is the belt to that pair of braces, so a section
 * emptied by a later edit cannot leave a bare heading behind.
 */
function hasContent(section: LegalSection): boolean {
  return section.blocks.length > 0;
}

export function LegalDocument({
  content,
  contentsLabel,
}: {
  content: LegalDocumentContent;
  contentsLabel: string;
}) {
  const sections = content.sections.filter(hasContent);

  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        heading={content.heading}
        intro={content.intro}
      >
        {content.scopeNote ? (
          <p className="mt-6 max-w-3xl border-l-4 border-accent py-2 pl-4 text-base text-ink-muted">
            {content.scopeNote}
          </p>
        ) : null}

        <nav aria-label={contentsLabel} className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest text-ink-muted uppercase">
            {contentsLabel}
          </h2>
          <ol className="mt-4 flex flex-col gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 items-center text-base font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </PageHeader>

      <Container>
        <div className="max-w-3xl py-14 sm:py-16 lg:py-20">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="mt-12 first:mt-0"
            >
              <h2
                id={`${section.id}-heading`}
                className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              >
                {section.heading}
              </h2>

              {section.blocks.map((block) =>
                block.kind === "paragraph" ? (
                  <p key={block.id} className="mt-5 text-base text-ink-muted">
                    {block.text}
                  </p>
                ) : (
                  <div key={block.id}>
                    {block.intro ? (
                      <p className="mt-5 text-base text-ink-muted">
                        {block.intro}
                      </p>
                    ) : null}
                    <ul className="mt-4 flex flex-col gap-2 border-l-2 border-border pl-5">
                      {block.items.map((item) => (
                        <li key={item} className="text-base text-ink-muted">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
