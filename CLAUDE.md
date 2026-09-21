@AGENTS.md

# Talentrax Global — public marketing frontend

US staffing and recruiting (healthcare, IT, professional). Greenfield rebuild.
Public marketing site only: **no backend, no CMS, no database, no auth, no API
routes.** Do not add any.

## Brand

**The name is "Talentrax Global"** — one word, capital T, **lowercase r**.
Never "TalentRax". Non-negotiable, and it applies to running text, navigation,
page metadata, body copy and JSON-LD alike.

**All-caps exception:** rendering the wordmark as `TALENTRAX` is a deliberate
typographic treatment and stays allowed — the client's own mark does it. The
rule governs mixed case only: wherever the name is written with capitals and
lowercase mixed, the r is lowercase.

The domain is `talentraxglobal.com` and is unaffected either way.

Everything visible derives from `site.name` / `site.legalName` in
`content/site.ts`, so the spelling is pinned in one place — no component
hardcodes it. `npm run check:seo` asserts that no route ships the capital-R
spelling; it matches `TalentRax` specifically, so an all-caps wordmark does not
trip it. That assertion is why the string appears in `scripts/check-seo.sh`
and in this section: both are guards, not occurrences to fix.

## Content rules

Client instruction, not a style preference:

- **No testimonials.** No quotes, no attributed praise, nothing
  testimonial-shaped.
- **No client logos.**
- **No named people.** No bylines, no team bios, no quoted spokespeople.
- **No statistics or metrics anywhere on the site.** No placement counts, no
  time-to-fill figures, no percentages, no satisfaction scores, no
  years-in-business claims.

**The only numbers allowed are computed live from the database** — the count
of open roles, for example.

Placeholder figures are not an exception: `0,000+` and `00 days` were still
statistics, so the trust bar that carried them is gone and nothing replaces
it. Note that this site has no backend and no database (see the top of this
file), so until one exists the practical effect is **no figures at all**. A
number that cannot be traced to a live query does not go on a page.

Counts inside a heading that describe what is rendered directly beneath it
("Five ways to staff a team", above five cards) are not claims about the
business, and the step ordinals `01`–`04` are structure, not data. Both stay.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · React 19.

- Tailwind v4 is **CSS-first**: there is no `tailwind.config.js`. Theme tokens
  live in the `@theme` block in `src/app/globals.css`.
- Never hand-pin `next`, `react` or `react-dom` versions.
- No UI component library. Components are built in `src/components/`.

## Build status

Built: `/`, the three Employers routes, the two Job Seekers routes and the
two legal routes (see **Routes**). Every other route renders the shared
`ComingSoon` component.
Those routes exist so navigation works and the URL structure is locked in
early.

The two forms - `/employers/request-talent` and
`/job-seekers/upload-resume` - are the only client components on the site.
Neither has a backend. Each submits through one swappable function that logs
its payload and returns success:

| Form | Seam |
| --- | --- |
| Request Talent | `submitRequisition()` in `src/lib/request-talent.ts` |
| Upload Resume | `submitApplication()` in `src/lib/job-seekers.ts` |

Wiring a real endpoint is a change to that one file. The resume upload is
stubbed on purpose: the `File` rides in the payload, and the TODO spells out
the presigned-URL upload it needs instead of a multipart POST.

**Shared data.** `src/content/taxonomy.ts` holds the five engagement models
and the three desks. Both sections render them and both forms build their
option lists from them, so Employers and Job Seekers cannot advertise
different specialties.

## The six rules

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
- **Forms** (`/employers/request-talent` and `/job-seekers/upload-resume`,
  primitives in `components/ui/Field.tsx`): a real `<label>` on every control, `fieldset` +
  `legend` per group, `noValidate` plus our own messages, `aria-invalid` and
  `aria-describedby` per field, and an error summary with `role="alert"` that
  takes focus on a failed submit. Required is the `required` attribute **and**
  a visible asterisk explained by a line above the form - never colour.
  Control borders - and any other boundary that identifies a control, such as
  a secondary button - use `--color-border-control`, which clears 3:1
  (1.4.11). `--color-border-strong` is 1.5:1 and is for decoration only.

### 4. Coming-soon routes must be noindex

Every coming-soon route sets `robots: { index: false, follow: true }` via
`buildMetadata({ noIndex: true })`. We do not want 13 empty pages indexed.
`follow` stays true so crawlers still traverse the navigation.

`robots.ts` deliberately allows the crawl: a `Disallow` would stop crawlers
reading the pages at all, so they would never see the `noindex`.

**When a section is built, four edits go together:**

1. drop `noIndex` from the route's `buildMetadata` call,
2. remove it from `comingSoonRoutes` in `content/navigation.ts`,
3. add it to `BUILT_ROUTES` in `app/sitemap.ts`,
4. move it from `COMING_SOON_ROUTES` to `BUILT_ROUTES` in
   `scripts/check-seo.sh`.

Miss the last one and `npm run check:seo` fails, which is the point: it
asserts both directions, that every built route is indexable and in the
sitemap, and that no noindex route is.

### 5. Null content renders nothing

**Never render a placeholder for missing copy.** No bracketed label, no
`[TBD]`, no "coming soon" inline marker, no empty row where a value will go.
If the data is absent, the element is absent.

A commercial point on `/employers/services` carries `detail: string | null`.
When it is null the whole term is skipped - no label, no container, nothing.
The unconfirmed points stay in the data so there is a checklist to fill in,
and they appear on the page the moment they have a value.

This is why `isPlaceholder` (rule 1) exists as data rather than as rendered
text, and it is the same instinct: the site says what is true or says
nothing. A coming-soon **route** is a different thing - that is a whole page
with its own explanation, not a gap in a sentence.

### 6. No external assets, no third-party scripts

- No external image URLs, no placeholder image services, no `<img>`. Where real
  imagery will go, render a token-coloured gradient block marked `image-slot`
  or `image-slot-soft` (see `globals.css`).
- No analytics, cookie banners, chat widgets or third-party scripts.
- No `localStorage` or `sessionStorage`.
- No invented client logos, testimonials, named people, statistics or
  figures of any kind — see **Content rules** above.

## Routes

Built (indexable, in the sitemap):

```
/                             /job-seekers
/employers                    /job-seekers/upload-resume
/employers/services           /privacy-policy
/employers/request-talent     /terms
```

Coming soon (all noindex, all real routes):

```
/industries                   /faq
/specialties                  /about
/jobs                         /contact
/locations                    /login
/insights                     /register
/research                     /accessibility
/resources
```

Nothing links to `/industries` or `/specialties` any more. Both described the
desks, and the desks are a real section at `/employers#specialties`, so the
nav entries collapsed into one pointing there and the home page specialties
CTA follows it. The routes still exist.

Plus a custom `app/not-found.tsx`.

Adding a coming-soon route: add an entry to `comingSoonRoutes` in
`content/navigation.ts`, then create `app/<path>/page.tsx` from any existing
coming-soon page (they are all the same four-line stub).

## Unanswered client questions

`CLIENT-CONFIRM.md` at the repo root lists every fact the build could not
derive from its own code: retention periods, named processors, the
data-rights contact address, international transfers, governing law, and the
commercial terms behind `/employers/services`.

**None of them is written into a page as a guess or a placeholder.** The
sentence that would carry each one is absent, and where that empties a
section the section is gone too (rule 5). Every omission is marked with an
`OMITTED` comment in `src/content/legal.ts`, or a `detail: null` in
`src/content/taxonomy.ts`, pointing at its numbered question.

That file also carries a release gate: **`/job-seekers/upload-resume` must
not be publicly reachable until the privacy items are answered and the policy
has been through the client lawyer review.**

## SEO baseline

- Per-route unique title, description and canonical, all via
  `buildMetadata()` in `src/lib/metadata.ts`.
- `metadataBase` comes from `NEXT_PUBLIC_SITE_URL` with a localhost fallback
  (see `.env.example`).
- Organization + WebSite JSON-LD on the **home page only**, server-rendered.
- The 404 page does **not** set `robots`. Next.js injects
  `<meta name="robots" content="noindex">` on any page returning a 404, so
  setting it in `not-found.tsx` too emitted two tags and confused SEO audits.

`npm run check:seo` asserts all of this against a running server.

## Environment variables

One variable: `NEXT_PUBLIC_SITE_URL`. Absolute origin, no trailing slash.
`src/content/site.ts` reads it and falls back to `http://localhost:3000`.

**It must be set in every build environment — local, CI and Netlify.**

`NEXT_PUBLIC_*` values are inlined into the output by `next build`. They are
**not** read again when the server starts, and every page here is statically
generated. So if the variable is missing during the build:

- every canonical URL is `http://localhost:3000/...`
- every JSON-LD `@id` points at localhost
- `robots.txt` and `sitemap.xml` advertise localhost

Setting the variable in the runtime environment afterwards does **not** fix
any of that — it takes another build. A deploy that silently ships localhost
canonicals is the failure this is guarding against.

| Where | How |
| --- | --- |
| Local | `.env.local` (gitignored; copy from `.env.example`) |
| CI | export before `next build` |
| Netlify | Site configuration → Environment variables, per context |

`netlify.toml` deliberately does not set it, so deploy previews and branch
deploys can carry their own origin instead of all claiming production's.

## Commands

```bash
npm run dev       # dev server, http://localhost:3000
npm run build     # production build
npm run start     # serve the production build
npm run lint      # eslint
npm run check:seo # assert the SEO invariants against a running server
```

`check:seo` takes an optional base URL and expected origin. The two differ when
you serve a production build locally — the build is stamped with the real
domain while being served from localhost:

```bash
npm run check:seo -- http://localhost:3000 https://www.talentraxglobal.com
```
