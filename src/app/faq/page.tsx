import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand } from "@/components/ui/CtaBand";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  faqCta,
  faqGroups,
  faqGroupsNavLabel,
  faqHero,
  faqMeta,
} from "@/content/faq";
import { faqPageJsonLd } from "@/lib/faq-schema";
import { buildMetadata } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/seo";

// A built route: no noIndex, in app/sitemap.ts, and out of comingSoonRoutes
// and COMING_SOON_ROUTES. See CLAUDE.md, rule 4.
export const metadata: Metadata = buildMetadata({
  title: faqMeta.title,
  description: faqMeta.description,
  path: "/faq",
});

/**
 * FAQ.
 *
 * Every answer is content that already exists elsewhere on the site, and
 * links to the fuller version. Nothing here was invented to round the page
 * out - the questions with no answer in this repo are in CLIENT-CONFIRM.md
 * instead of on the page. See the header of content/faq.ts.
 *
 * FAQPage structured data is generated from the same array the page renders,
 * so the markup cannot drift from the visible answers - which is the rule
 * Google actually enforces here.
 *
 * Headings run h1 (page) -> h2 (group) -> h3 (question), nothing skipped.
 * Answers are not collapsed behind a disclosure: there are no long ones, and
 * an accordion would add keyboard machinery for no gain.
 */
export default function Page() {
  const jsonLd = serializeJsonLd(faqPageJsonLd(faqGroups));

  return (
    <>
      <script
        type="application/ld+json"
        // Payload is escaped in serializeJsonLd(); "<" cannot break out.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <PageHeader
        eyebrow={faqHero.eyebrow}
        heading={faqHero.heading}
        intro={faqHero.intro}
      >
        <nav aria-label={faqGroupsNavLabel} className="mt-10">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {faqGroups.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="inline-flex min-h-11 items-center text-base font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
                >
                  {group.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      <Container>
        <div className="max-w-3xl py-14 sm:py-16 lg:py-20">
          {faqGroups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-heading`}
              className="mt-16 first:mt-0"
            >
              <h2
                id={`${group.id}-heading`}
                className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              >
                {group.heading}
              </h2>
              <p className="mt-3 text-base text-ink-muted">{group.intro}</p>

              <div className="mt-8 flex flex-col gap-10">
                {group.items.map((item) => (
                  <div key={item.id} id={item.id}>
                    <h3 className="text-xl font-bold text-ink">
                      {item.question}
                    </h3>
                    {item.answer.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="mt-3 text-base text-ink-muted"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {item.link ? (
                      <p className="mt-3 text-base">
                        <Link
                          href={item.link.href}
                          className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
                        >
                          {item.link.label}
                          <span aria-hidden="true"> &rarr;</span>
                        </Link>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>

      <CtaBand content={faqCta} headingId="faq-cta-heading" />
    </>
  );
}
