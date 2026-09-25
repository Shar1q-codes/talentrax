import Link from "next/link";
import type { ReactNode } from "react";

import { articleDetail, INSIGHTS_PATH } from "@/content/insights";
import type { Article, ArticleBlock, RichText } from "@/lib/insights";

/**
 * Everything below an article's title: the key takeaways, the body blocks,
 * the FAQ, the sources and the related reading. Rendered by the full page
 * (app/insights/[slug]) and, inside a dialog, by the modal
 * (app/insights/(index)/@modal), so the two can never drift apart.
 *
 * `base` is the heading level the article's own sections render at: 2 on
 * the page, whose h1 is the title, and 3 in the modal, whose title is an h2
 * beneath the index page's h1. Nothing skips a level either way.
 *
 * INLINE LINKS come from the marks on each RichText. Every href was
 * resolved by the importer to a path on this site or an absolute https URL,
 * so this file never checks whether a target exists. Internal links go
 * through next/link; a link to another article from inside the modal is a
 * soft navigation, which the index layout intercepts into the same modal.
 *
 * NO CHARTS. The tables are cited figures and they read exactly as written;
 * a table is a <table>, scrollable sideways on a narrow screen.
 *
 * Server component: nothing here is interactive.
 */

type HeadingBase = 2 | 3;
type HeadingTag = "h2" | "h3" | "h4";

const HEADING_CLASSES = [
  "mt-12 text-2xl font-bold tracking-tight text-ink first:mt-0 sm:text-3xl",
  "mt-10 text-xl font-bold tracking-tight text-ink",
] as const;

function Heading({
  base,
  offset,
  id,
  children,
}: {
  base: HeadingBase;
  /** 0 for a section heading, 1 for a heading inside a section. */
  offset: 0 | 1;
  id?: string;
  children: ReactNode;
}) {
  const Tag = `h${base + offset}` as HeadingTag;
  return (
    <Tag id={id} className={HEADING_CLASSES[offset]}>
      {children}
    </Tag>
  );
}

const paragraphClass = "mt-5 text-base text-ink-muted first:mt-0";
const listClass = "mt-5 flex flex-col gap-2 pl-5";
const itemClass = "text-base text-ink-muted";

/** Prose with its link marks turned into anchors. */
export function Prose({ rich }: { rich: RichText }) {
  const marks = rich.links ?? [];
  if (marks.length === 0) return <>{rich.text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) parts.push(rich.text.slice(cursor, mark.start));
    const label = rich.text.slice(mark.start, mark.end);
    parts.push(
      mark.href.startsWith("/") ? (
        <Link key={mark.start} href={mark.href} className="link-inline">
          {label}
        </Link>
      ) : (
        <a
          key={mark.start}
          href={mark.href}
          rel="noopener noreferrer"
          className="link-inline"
        >
          {label}
        </a>
      ),
    );
    cursor = mark.end;
  }
  if (cursor < rich.text.length) parts.push(rich.text.slice(cursor));
  return <>{parts}</>;
}

function Block({
  block,
  index,
  base,
}: {
  block: ArticleBlock;
  index: number;
  base: HeadingBase;
}) {
  // Blocks have no ids of their own: they are positional content from the
  // source, so the index is the only stable key available.
  const key = `${block.kind}-${index}`;

  if (block.kind === "heading") {
    return (
      <Heading key={key} base={base} offset={block.level === 2 ? 0 : 1}>
        {block.text}
      </Heading>
    );
  }

  if (block.kind === "list") {
    const items = block.items.map((item) => (
      <li key={item.text} className={itemClass}>
        <Prose rich={item} />
      </li>
    ));
    return block.ordered ? (
      <ol key={key} className={`${listClass} list-decimal marker:font-semibold marker:text-ink`}>
        {items}
      </ol>
    ) : (
      <ul key={key} className={`${listClass} list-disc marker:text-accent`}>
        {items}
      </ul>
    );
  }

  if (block.kind === "table") {
    return (
      // A scroll region is keyboard-reachable so the right-hand columns
      // are not lost to anyone who cannot swipe. The table itself never
      // shrinks below a readable width; the region scrolls instead.
      <div
        key={key}
        role="region"
        aria-label={articleDetail.tableLabel}
        tabIndex={0}
        className="mt-6 overflow-x-auto rounded-lg border border-border"
      >
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm sm:text-base">
          <thead className="bg-surface-muted">
            <tr>
              {block.header.map((cell, cellIndex) => (
                <th
                  key={`${cellIndex}-${cell}`}
                  scope="col"
                  className="border-b border-border-strong px-4 py-3 align-top font-semibold text-ink"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[0]}`} className="border-b border-border last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cellIndex}-${cell}`}
                    className={`px-4 py-3 align-top ${cellIndex === 0 ? "font-medium text-ink" : "text-ink-muted"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <p key={key} className={paragraphClass}>
      <Prose rich={block} />
    </p>
  );
}

export function ArticleBody({
  article,
  related,
  base,
  idPrefix,
}: {
  article: Article;
  /** Already resolved from `article.related`; only articles that exist. */
  related: Article[];
  base: HeadingBase;
  /** Keeps the section ids unique when the page and the modal coexist. */
  idPrefix: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <aside
        aria-labelledby={id("takeaways")}
        className="rounded-lg border border-border bg-brand-soft p-6 sm:p-8"
      >
        <Heading base={base} offset={0} id={id("takeaways")}>
          <span className="text-xl sm:text-2xl">{article.keyTakeaways.heading}</span>
        </Heading>
        <ul className="mt-4 flex flex-col gap-3 pl-5 list-disc marker:text-brand">
          {article.keyTakeaways.items.map((item) => (
            <li key={item} className="text-base text-ink">
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <div className="mt-10">
        {article.body.map((block, index) => (
          <Block key={`${block.kind}-${index}`} block={block} index={index} base={base} />
        ))}
      </div>

      {article.faqs.length > 0 ? (
        <section
          aria-labelledby={id("faq")}
          className="mt-12 rounded-lg border border-border bg-surface-muted p-6 sm:p-8"
        >
          <Heading base={base} offset={0} id={id("faq")}>
            <span className="text-xl sm:text-2xl">{articleDetail.faqHeading}</span>
          </Heading>
          <dl className="mt-2">
            {article.faqs.map((faq) => (
              <div key={faq.question} className="border-t border-border-strong py-5 first:border-t-0">
                <dt className="text-lg font-semibold text-ink">{faq.question}</dt>
                {faq.answer.map((paragraph) => (
                  <dd key={paragraph.text} className="mt-3 text-base text-ink-muted">
                    <Prose rich={paragraph} />
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby={id("sources")} className="mt-12">
        <Heading base={base} offset={0} id={id("sources")}>
          {articleDetail.sourcesHeading}
        </Heading>
        <ol className={`${listClass} list-decimal marker:text-ink-subtle`}>
          {article.sources.map((source) => (
            <li key={`${source.name}-${source.url}`} className={`${itemClass} break-words`}>
              <a href={source.url} rel="noopener noreferrer" className="link-inline">
                {source.name}
              </a>
            </li>
          ))}
        </ol>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby={id("related")} className="mt-12">
          <Heading base={base} offset={0} id={id("related")}>
            {articleDetail.relatedHeading}
          </Heading>
          <ul className={`${listClass} list-disc marker:text-accent`}>
            {related.map((other) => (
              <li key={other.slug} className={itemClass}>
                <Link href={`${INSIGHTS_PATH}/${other.slug}`} className="link-inline">
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
