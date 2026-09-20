@AGENTS.md

# TalentRax Global — public marketing frontend

US staffing and recruiting (healthcare, IT, professional). Greenfield rebuild.
Public marketing site only: **no backend, no CMS, no database, no auth, no API
routes.** Do not add any.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · React 19.

- Tailwind v4 is **CSS-first**: there is no `tailwind.config.js`. Theme tokens
  live in the `@theme` block in `src/app/globals.css`.
- Never hand-pin `next`, `react` or `react-dom` versions.
- No UI component library. Components are built in `src/components/`.

## Build status

`/` is fully built. Every other route renders the shared `ComingSoon`
component. The routes exist so navigation works and the URL structure is
locked in early.

## The five rules

### 1. Content lives in data files, never inline in components

All copy and navigation live in typed objects under `src/content/`:

| File | Owns |
| --- | --- |
| `content/site.ts` | company name, tagline, contact details, social, `SITE_URL` |
| `content/navigation.ts` | nav tree, footer columns, the coming-soon route registry |
| `content/home.ts` | every landing page section's copy |

Components import a typed object and map over it. **A new nav link or a copy
change is an edit to `src/content/`, not to a component.** This site moves to a
CMS later; when it does, only the data source changes and no component is
touched.

Unconfirmed client data carries `isPlaceholder: true`. Code that emits
machine-readable output (JSON-LD, sitemap) must skip placeholder values rather
than publish invented facts — see `src/lib/seo.ts`.

### 2. Design tokens only — no hardcoded values in components

Every colour, radius, spacing step and type step is a CSS custom property in
the `@theme` block of `src/app/globals.css`.

**No hex value may appear inside a component.** Need a new colour? Add a token
first, with its contrast ratio in the comment, then use the generated utility
(`--color-brand` → `bg-brand` / `text-brand` / `border-brand`).

### 3. Accessibility is non-negotiable — WCAG 2.1 AA

- **Contrast AA on every text/background pair.** Applies to decorative text
  too. Token comments in `globals.css` record the measured ratios.
- **Never remove a focus outline.** One global `:focus-visible` rule in
  `globals.css` covers everything; dark bands add the `on-brand` class, which
  swaps the ring to white.
- **Keyboard operable throughout.** Dropdowns and the mobile drawer: correct
  ARIA, arrow-key navigation, Escape closes and returns focus to the trigger.
  The drawer traps Tab and is `inert` when closed.
- Dropdowns use the **disclosure** pattern (button + region), not
  `menu`/`menuitem` — these are navigation links, not app menu commands.
- Skip-to-content link is the first focusable element; `<main>` has
  `tabIndex={-1}` so focus actually lands there.
- `prefers-reduced-motion` is honoured globally.
- Exactly **one `<h1>` per page**, no skipped heading levels.
- Mobile-first, 16px side gutters, **no horizontal scroll at 320px**.

### 4. Coming-soon routes must be noindex

Every coming-soon route sets `robots: { index: false, follow: true }` via
`buildMetadata({ noIndex: true })`. We do not want 19 empty pages indexed.
`follow` stays true so crawlers still traverse the navigation.

`robots.ts` deliberately allows the crawl: a `Disallow` would stop crawlers
reading the pages at all, so they would never see the `noindex`.

**When a section is built, two edits go together:** drop `noIndex` from its
route, and add it to `app/sitemap.ts`. The sitemap currently lists `/` only.

### 5. No external assets, no third-party scripts

- No external image URLs, no placeholder image services, no `<img>`. Where real
  imagery will go, render a token-coloured gradient block marked `image-slot`
  or `image-slot-soft` (see `globals.css`).
- No analytics, cookie banners, chat widgets or third-party scripts.
- No `localStorage` or `sessionStorage`.
- Do not invent client logos, testimonials, named people or statistics. Every
  figure on the home page is a visible placeholder (`0,000+`, `00 days`) and
  the page says so.

## Routes

Built: `/`

Coming soon (all noindex, all real routes):

```
/employers                    /insights
/employers/services           /research
/employers/request-talent     /resources
/industries                   /faq
/specialties                  /about
/job-seekers                  /contact
/job-seekers/upload-resume    /login
/jobs                         /register
/locations                    /privacy-policy
                              /terms
                              /accessibility
```

Plus a custom `app/not-found.tsx`.

Adding a coming-soon route: add an entry to `comingSoonRoutes` in
`content/navigation.ts`, then create `app/<path>/page.tsx` from any existing
coming-soon page (they are all the same four-line stub).

## SEO baseline

- Per-route unique title, description and canonical, all via
  `buildMetadata()` in `src/lib/metadata.ts`.
- `metadataBase` comes from `NEXT_PUBLIC_SITE_URL` with a localhost fallback
  (see `.env.example`).
- Organization + WebSite JSON-LD on the **home page only**, server-rendered.

## Commands

```bash
npm run dev     # dev server, http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```
