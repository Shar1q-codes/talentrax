import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { Section, SectionHeader } from "@/components/ui/Section";
import { latestArticles } from "@/content/home";
import type { Article } from "@/lib/insights";

/**
 * The newest articles as a horizontal rail, headed by a link to /insights.
 *
 * NATIVE SCROLLING. The rail is overflow-x plus CSS scroll-snap, in
 * ui/ScrollRail.tsx. This component stays on the server: all six cards are
 * in the initial HTML and nothing loads on scroll. It is never a
 * fixed-height box with its own vertical scrollbar; a nested vertical
 * scroller on a landing page traps the wheel.
 *
 * INFINITE, AND IT DRIFTS, at the client's request: the cards are rendered
 * three times so the rail can recentre on the middle set in either
 * direction; the outer two sets are hidden from assistive tech and the tab
 * order. The native scrollbar is hidden (it would show a finite range and
 * jump on every recentre), so previous/next buttons are the visible manual
 * control. The pause button and every pause condition are in ScrollRail.
 * The drift does not start at all under reduced motion. No dots, counters
 * or slide indicators.
 *
 * HEADER ROW. The heading on the left; "All articles", then the icon-only
 * previous, next and pause buttons on the right, in that tab order, all
 * before the rail.
 *
 * KEYBOARD. The region takes focus (named by `railLabel`), so the arrow
 * keys scroll it. Tabbing to a card brings the whole card into view - the
 * browser alone does not, for a card that is partly visible; ScrollRail
 * explains. Snapping is `mandatory` on `start` and every card is narrower
 * than the rail, so a focused card's snap point always shows all of it.
 *
 * SIZING. Each card is narrower than the rail at every width (4/5, then
 * 5/12, then 2/7), so the next card always shows at the edge - that edge is
 * what says the rail scrolls. The rail lives inside the container, so at
 * 320px it is the rail that scrolls, never the page.
 *
 * The whole card is the link target: the title link stretches over it with
 * a pseudo-element, so a tap anywhere on a card opens it. That is a normal
 * navigation to the full article page; only the /insights index intercepts
 * into the modal.
 */
export function LatestArticles({ articles }: { articles: Article[] }) {
  // Rule 6: nothing to show, nothing rendered - not an empty rail.
  if (articles.length === 0) return null;

  return (
    // Muted: it sits between the split section and how it works, both on
    // the default surface. White cards on the muted band.
    <Section
      id="latest-articles"
      tone="muted"
      labelledBy="latest-articles-heading"
    >
      <ScrollRail
        label={latestArticles.railLabel}
        controls={latestArticles.controls}
        header={
          <SectionHeader
            flush
            headingId="latest-articles-heading"
            eyebrow={latestArticles.eyebrow}
            heading={latestArticles.heading}
            intro={latestArticles.intro}
          />
        }
        actions={
          <ButtonLink
            href={latestArticles.allLink.href}
            variant={latestArticles.allLink.variant}
          >
            {latestArticles.allLink.label}
          </ButtonLink>
        }
      >
        <ul className="flex gap-4 sm:gap-6">
          {(["before", "real", "after"] as const).map((set) =>
            articles.map((article) => {
              const isCopy = set !== "real";
              return (
              <li
                key={`${set}-${article.id}`}
                // Three identical sets: the middle one is the real one. The
                // copies either side are hidden from assistive tech, out of
                // the tab order, and not displayed at all until ScrollRail
                // sets data-infinite - so the server HTML shows six cards.
                aria-hidden={isCopy ? true : undefined}
                data-rail-copy={isCopy ? set : undefined}
                className={`${isCopy ? "hidden [[data-infinite]_&]:flex" : "flex"} shrink-0 basis-4/5 snap-start sm:basis-5/12 lg:basis-2/7`}
              >
                <Card className="relative flex w-full flex-col hover:border-border-strong">
                  <h3 className="text-lg font-bold text-ink">
                    <Link
                      href={`/insights/${article.slug}`}
                      tabIndex={isCopy ? -1 : undefined}
                      className="no-underline transition-colors after:absolute after:inset-0 hover:text-brand active:text-brand-strong"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  <p className="mt-3 line-clamp-4 text-base text-ink-muted">
                    {article.summary}
                  </p>
                </Card>
              </li>
              );
            }),
          )}
        </ul>
      </ScrollRail>
    </Section>
  );
}
