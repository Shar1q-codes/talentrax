@AGENTS.md

# Talentrax Global — marketing site, and the first pieces of the ATS

US staffing and recruiting (healthcare, IT, professional). Greenfield rebuild.
A public marketing site, gaining its first backend: the three public forms
are being wired to Supabase, with a small internal inbox for staff to read
what arrives. Until a form is wired it says it is not open (**Build
status**). **No CMS.** Everything else on the site is static content.

**The decision this replaces was deliberate, and so is its scope.** The site
had no backend at all. It now has exactly what the ATS's first piece needs,
built in order (forms, staff sign-in, inbox), and nothing beyond it: no
candidate accounts, no pipeline, no API for anything but the resume upload.
A new kind of backend surface is a decision in its own right, not a
follow-on detail of whatever needs it.

`supabase/` is the database, as SQL migrations; see **The ATS schema**.
`src/lib/supabase/` holds the env guard and the three client constructors
(below), and `src/lib/database.types.ts` the generated types.

**Three clients, one job each:**

| Constructor | Key | Session | For |
| --- | --- | --- | --- |
| `browser.ts` | anon | none: nothing persisted, refreshed or read from the URL | the three public forms, inserting straight from the visitor's browser |
| `server.ts` | anon + the user's session | an HttpOnly cookie scoped to `/staff`, forced on everything `@supabase/ssr` sets | staff pages, server actions, the proxy's session refresh; RLS applies as them |
| `admin.ts` | service role (bypasses RLS) | none | the resume-upload endpoints only |

- **The forms insert from the browser, on purpose.** The rate limit
  (migration 9) keys on the client address Supabase's edge records. Through
  our server every visitor would share one address and one limit; through
  the service role nobody would be limited.
- **`server.ts` and `admin.ts` import `server-only`,** so any client import
  is a build error.
- **The service-role key never reaches a browser.** It has no
  `NEXT_PUBLIC_` prefix, and eslint confines `admin.ts` to a feature's
  `queries.server.ts`. `npm run build` ends with `scripts/check-bundle.mjs`,
  which fails the build if the key's name appears in anything served to a
  browser (`.next/static`, source maps included), or its value anywhere in
  the build output, server code and every source map included.

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
it. Nothing on the site reads the database for display (see the top of this
file), so until something does the practical effect is **no figures at all**. A
number that cannot be traced to a live query does not go on a page.

Counts inside a heading that describe what is rendered directly beneath it
("Five ways to staff a team", above five cards) are not claims about the
business, and the step ordinals `01`–`04` are structure, not data. Both stay.

**Cited third-party statistics in the insights articles are allowed, and
are preserved exactly.** The rule above bans invented claims about
Talentrax's own performance. It does not ban a figure from BLS, HRSA, NSI or
any other named source when the attribution stays attached to the number:
those citations are the entire value of the articles under `/insights`.
Nothing rounds, restates, drops or "cleans up" a figure, on import or
afterwards, and every article renders its sources as visible links. A
statistic about Talentrax itself is still forbidden, in an article or
anywhere else, and a figure with no source attached does not go in one.

## What we offer

Three engagement models, in `src/content/taxonomy.ts`: **Direct Hire**,
**Contract**, **Executive Search**. Healthcare RPO and Contract-to-Hire were
withdrawn by the client and must not come back without them asking.

That array is the single source. The services page, its anchors, the cards on
`/employers`, the requisition form's service select and the upload form's
engagement checkboxes all derive from it. The home page keeps its own shorter
card copy but asserts every card id against the array at build time, so it
cannot advertise a withdrawn service.

**This is separate from the three desks** - Healthcare, Technology,
Professional - which are the disciplines we recruit in, also in
`taxonomy.ts`, and untouched by any of that. Healthcare staffing is a desk,
not a service model; withdrawing Healthcare RPO did not narrow it.

`npm run check:seo` asserts the three anchors exist on the services page,
that every card on `/employers` links to one that does, and that the two
withdrawn models are absent. That assertion is why "RPO" and
"contract-to-hire" still appear in `scripts/check-seo.sh`: like the
`TalentRax` check, they are guards, not occurrences to fix.

## Stack

- Tailwind v4 is **CSS-first**: there is no `tailwind.config.js`. Theme tokens
  live in the `@theme` block in `src/app/globals.css`.
- Never hand-pin `next`, `react` or `react-dom` to a version of your own
  choosing. **Security updates are the exception**: when `npm audit`
  reports an advisory against the installed version, move to the patched
  release and record why here. Applied so far: `next` and
  `eslint-config-next` 16.3.5 -> 16.3.8, for GHSA-vcvr-r3jv-pc5j (critical,
  remote code execution in `next/og` `ImageResponse`, affecting
  16.2.0-16.3.5). This site does not import `next/og`, but the package
  ships it and the advisory is critical, so it was not left to argue
  about.
- No UI component library. Components are built in this repo; see
  **Repository layout** for where each kind goes.
- `@supabase/ssr` is pinned exactly (`0.12.7`), because it owns how the
  staff session cookie is written. Upgrade it deliberately, and re-check
  that `server.ts` still forces HttpOnly on every cookie it sets.

## Repository layout

```
src/
  app/
    (marketing)/      every public route; route groups are not URL segments
    (portal)/         candidate and employer areas - layout only, no pages yet
    (internal)/       the ATS for staff roles: /staff and its sign-in steps
    api/              route handlers - none yet
    layout.tsx, not-found.tsx, sitemap.ts, robots.ts, globals.css
  features/<name>/    one folder per domain concept
    components/       UI only this feature uses
    queries.ts        data access that may run in the browser (browser client)
    queries.server.ts data access that must not: session and service-role
    index.ts          the public surface
    server.ts         the server-only public surface, if it has one
  components/
    ui/               primitives with no domain knowledge
    layout/           header, footer, drawer, nav, skip link
    marketing/        the sections the (marketing) pages compose
  content/            marketing copy, and the imported articles
  lib/                cross-cutting only: Supabase clients and env, metadata,
                      site-wide JSON-LD
```

Features today: `articles`, `jobs`, `employers` (the request form),
`job-seekers` (the upload form), `contact`, `auth`. Empty, with a README
line: `candidates`, `requisitions`, `submissions`, `interviews`, `offers`,
`placements`, `leads`, `activities`. A feature may also own a `schema.ts`
(zod) and a `types.ts` (derived types); none does yet, because nothing is
validated with zod and no type is derived from the database yet. The
hand-written types live beside the functions that use them in `queries.ts`.

**The root layout has no chrome.** The public site's skip link, header,
`<main>` and footer are `components/layout/SiteChrome.tsx`, drawn by
`(marketing)/layout.tsx`, so `(internal)` and `(portal)` do not inherit the
marketing navigation. Two 404 pages, one body (`NotFoundContent`):

| File | Renders for | Chrome |
| --- | --- | --- |
| `app/not-found.tsx` | an unmatched URL, anywhere | draws `SiteChrome` itself: it renders in the root layout, above every group |
| `app/(marketing)/not-found.tsx` | `notFound()` thrown by a public route (an unknown job or article) | none of its own: it renders inside the `(marketing)` layout |

Put chrome in the second one and the page has two headers, two `<main>`s
and two footers - it did, for one build. `tests/browser/site.spec.ts`
counts them on both kinds of 404.

`src/content/articles/` does not move: the importer writes there. Its link
check resolves internal links against `src/app/(marketing)/`, so a public
route created outside that group would make the importer drop links to it.

### Feature boundaries

1. **A feature's internals are private.** Code outside
   `src/features/<name>/` imports from `@/features/<name>` and nothing
   deeper - never `@/features/<name>/components/...` or its `queries`.
   **The one other entry point is `@/features/<name>/server`**, the
   feature's `server.ts`: its server-only public surface, for pages, server
   actions and route handlers. It is separate from `index.ts` because a
   client component may import the index, and a server-only module behind
   it would break that build. Inside a feature, files import each other
   relatively. The one exception: a `*.test.ts` may import another
   feature's `*.fixture.ts` directly, because fixtures are never exported
   from an `index.ts`, which is what keeps them out of the build.
2. **All database access lives in a feature's `queries.ts` and
   `queries.server.ts`.** No Supabase call in a component, page, layout or
   route handler, ever. This is what makes the RLS surface auditable: two
   files per feature list every query that feature can make.
   - `queries.ts` may be bundled for the browser, so it uses the browser
     client only.
   - `queries.server.ts` is server-only. It holds anything needing the
     user's session (`server.ts`) or the service role (`admin.ts`), and is
     reached through the feature's `server.ts`.
   - Only those two files and `src/lib/supabase/` may import a client or
     the SDK, and `queries.ts` may not import the server ones.
3. **`components/ui` is for primitives with no domain knowledge.** If it
   knows what a submission is, it belongs to a feature. A primitive earns a
   place there by being used by three or more features.
4. **`lib/` is not a dumping ground.** It holds what belongs to no feature.
   Anything domain-specific that lands there is misfiled.

Rules 1 and 2 are enforced by `no-restricted-imports` in
`eslint.config.mjs`, so `npm run lint` fails on a violation: a deep import
other than `/server`, a client in a component, or a session or service-role
client in `queries.ts`.

**Every feature folder carries a `package.json` of `{ "sideEffects": false }`,
and a new feature needs one too.** A barrel that re-exports a `"use client"`
component puts that component's chunk on every page that imports anything
from the barrel. Without the flag, the full article pages loaded the modal's
JavaScript, and `/login` loaded all three account forms. The flag lets the
bundler drop the re-exports a page does not use. In return, a module in a
feature must not rely on top-level side effects: anything it does on import
may be dropped.

**Aliases, never deep relative paths.** `@/features/*`, `@/components/*`,
`@/lib/*` and `@/content/*` are in `tsconfig.json`. A relative import may not
leave the top-level folder it starts in (`src/app`, `src/features`,
`src/components`, `src/content`, `src/lib`). `npm test` runs on plain Node,
which does not read tsconfig, so `scripts/alias-hooks.mjs` teaches it the
same `@/` mapping.

## Build status

Built: `/`, the three Employers routes, the two Job Seekers routes, `/jobs`
and its `/jobs/[slug]` detail route, `/about`, `/contact` and the two legal
routes (see **Routes**). Every other route renders the shared `ComingSoon`
component.
Those routes exist so navigation works and the URL structure is locked in
early.

The three forms - `/employers/request-talent`, `/job-seekers/upload-resume`
and `/contact` - are the only client components on the site.

| Form | Seam | State |
| --- | --- | --- |
| Contact | `submitContact()` in `src/features/contact/queries.ts` | **Wired**: inserts into `contact_messages` |
| Request Talent | `submitRequisition()` in `src/features/employers/queries.ts` | **Wired**: inserts a new `website_form` row into `leads` |
| Upload Resume | `submitApplication()` in `src/features/job-seekers/queries.ts` | Not wired: logs and returns `unavailable` |

**An unwired form** submits through its seam, which logs the payload and
returns `unavailable`. The page says the form is not open yet, above the
form, and the form says nothing was sent after a submit: the account
screens' pattern, with the same `NotOpenNotice` component and copy in each
form's content file (`notOpen`). The resume upload is stubbed on purpose:
the `File` rides in the payload, and the TODO spells out the presigned-URL
upload it needs instead of a multipart POST.

**A wired form follows the forms gate**, `publicFormsOpen()` in
`src/lib/supabase/forms-gate.ts`, asked once at build time by the page.
One answer drives three things, so they cannot disagree: the
`NotOpenNotice` (shown when closed), whether a valid submit reaches the
database (closed: "not open yet, nothing was sent", and no request leaves
the browser), and the storage disclosure on `/privacy-policy` (shown when
open). The rule is `decideFormsOpen()` in `src/lib/supabase/env.ts`,
pinned by `npm test`:

| Build | Wired forms |
| --- | --- |
| no Supabase URL or anon key | closed |
| `APP_ENV` unset, pointing at the local stack | open |
| `APP_ENV` unset, pointing at a hosted project | **closed**: a deploy that forgot to say which one it is |
| `APP_ENV=staging` | open |
| `APP_ENV=production` | closed until every `PRODUCTION_RELEASE` condition holds |

**`PRODUCTION_RELEASE` is a release gate, not dead code.** Its conditions:
the privacy policy says where submissions are stored
(`formStorage.location` in `content/legal.ts`, null until the hosted project
exists), and `inboxStaffed`, set by hand once the staff inbox (build step 8)
exists and a named staff account can sign in to it with a second factor.
Each is flipped in the commit that makes it true, and not before.

**What a visitor sees on a wired form**, every path:

| Path | What happens |
| --- | --- |
| Stored | The confirmation panel, focused. Also what a retry of a stored submission and a submission held by the per-email limit get: the database stores nothing twice and never refuses on email |
| Validation error | The error summary (`role="alert"`), focused, every problem linked to its control. Nothing is sent |
| 429 | "Too many ... recently, so yours was not sent", with the wait in minutes from the 429's body (migration 12; a browser cannot read `Retry-After` cross-origin), focused. What was typed stays. Never says which limit |
| Network failure, refused insert, outage | "Could not be sent, so it has not reached us", focused. What was typed stays. Sending again reuses the submission key, so a send that did land is not stored twice |
| Caught by the honeypot or the minimum time | **First trip in a submission attempt**: the same as a failure, and nothing is sent. **A repeat in the same attempt**: sent with `trap_tripped`, stored, held for staff review (`held_at`), and the visitor sees the confirmation. A person is never blocked for good (migration 13) |
| Gate closed | The notice above the form, and "This form is not open yet. Nothing was sent." |

**The submission attempt** is a UUID key made on the first send, resent on
every retry, and a count of spam-trap trips. Any edit to the form starts a
new attempt: changed content is a new submission, and must not be swallowed
as a retry of the old one. **The trip count is kept in the page's memory and
nowhere else**: a refused first trip sends no request, so nothing about a
refusal reaches the database, a log or the browser's storage; only a stored
row says a trap tripped, and that row is the person's own submission. A
reload starts over, which can only cost a person one more refusal. A wired
seam logs nothing.

**The build order** for the backend's first pieces. Each step is a commit
that leaves every check passing.

| Step | What | State |
| --- | --- | --- |
| 1-3 | The three Supabase clients; migration 11; the root layout split | Done |
| 4 | Contact wired, with the forms gate and the storage disclosure | Done |
| 5 | Request Talent wired | Done |
| 6 | Staff sign-in and sign-out, TOTP MFA required, the sign-in attempt limiter | Done |
| 7 | Resume upload endpoints and form, behind staff sign-in in production | |
| 8 | The staff inbox | |

Steps 6 and 7 were swapped from the first plan: the resume form's
production guard is staff sign-in, so sign-in has to exist first.

**Shared data.** `src/content/taxonomy.ts` holds the engagement models and
the three desks. Both sections render them and both forms build their
option lists from them, so Employers and Job Seekers cannot advertise
different specialties.

## The seven rules

### 1. Content lives in data files, never inline in components

All copy and navigation live in typed objects under `src/content/`.
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

### 3. Motion is two durations and one curve

Every transition and animation on this site uses tokens from the `@theme`
block in `globals.css`: `--ease-emphasized`, `--duration-fast` (150ms) and
`--duration-medium` (250ms). Those two are also set as Tailwind defaults, so
a bare `transition-colors` inherits them and **no component names a duration
or a curve**. If a third duration seems necessary, the interaction is wrong.

- **Transform, opacity and colour only.** Never width, height, top, left,
  margin, padding, border-width or box-shadow - each runs layout or a heavy
  paint on every frame. For elevation, fade a pseudo-element that carries the
  shadow.
- **No layout shift on hover, anywhere.** A border that thickens or a padding
  that grows nudges its neighbours. Recolour or translate instead.
- **:active matters more than :hover.** Most visits are on a phone where
  hover does not exist. `.pressable` (buttons) scales to 0.98; links and nav
  rows darken. A tap that does nothing feels broken.
- **The focus ring is never animated** and never delayed - `transition: none`
  on `:focus-visible`. It clears 3:1 on every background here: 4.6-5.4:1 on
  the light surfaces, 11.2:1 as white on the brand band.
- **Form feedback is instant.** `[role="alert"]` has transition and animation
  forced off, so an error can never race its own screen-reader announcement.
- **Banned outright:** reveal-on-scroll, parallax, scroll hijacking, custom
  cursors, marquees, typewriters, count-ups, page-transition overlays, and
  skeleton loaders on statically rendered pages. **No animation library** -
  all of this is CSS, and 40KB of JavaScript for hover states is the opposite
  of premium.
  **One exception, at the client's explicit request:** the home page's
  latest-articles rail drifts continuously (see **The insights index**). It
  is the only moving content on the site and the ban stands everywhere else.
- The header has **one scroll threshold and one change**: the bottom border
  gains colour. It does not shrink, change height, or hide on scroll.

**Scrolling.** `html { scroll-behavior: smooth }`, wrapped in
`prefers-reduced-motion: no-preference`. It is deliberately NOT scoped to
`html:focus-within`: that only matches where the browser focuses a clicked
link, which Chrome does and Safari and Firefox often do not, so anchors
jumped in those browsers. It also never protected route changes, because a
nav link click focuses a link too.

What keeps route changes instant is `data-scroll-behavior="smooth"` on
`<html>`, and only that. The App Router reads the attribute and forces
`scroll-behavior: auto` for the duration of a transition. **Remove the
attribute and every route change animates its jump to the top.**

**How an anchor link is written decides whether it glides:**

| href | element | why |
| --- | --- | --- |
| starts with `#` | plain `<a>` | native hash navigation, so `scroll-behavior` applies |
| a path, with or without a hash | `<Link>` | a real navigation, which should jump |

A same-page hash routed through `<Link>` becomes a router-driven scroll, and
the router suppresses smooth behaviour for its own scrolls - the anchor
jumps. Every same-page anchor on this site is already a plain `<a>`: the
engagement-model nav on `/employers/services`, the group jump list on
`/faq`, the contents list on the legal pages, all four form error
summaries, and the skip link.

Anchors land clear of the sticky header via `scroll-padding-top` on
`<html>`, derived from `--header-height` rather than restated.

**Nothing may put a height constraint on `<html>`, or an `overflow` on
`<html>` or `<body>` that outlives a navigation.** The router resets scroll
by assigning `document.documentElement.scrollTop = 0` during React's layout
phase. A locked or height-constrained document at that moment means the new
page opens at the old page's scroll offset. The mobile drawer's scroll lock
releases synchronously on any link inside it for exactly this reason - see
`closeForNavigation` in `MobileDrawer.tsx`.

Do **not** patch a scroll bug with a `useEffect` that scrolls to top on
pathname change. It fights the browser's own back/forward restoration, which
must keep working: back and forward restore the previous position, and only
a fresh navigation goes to the top.

### 4. Accessibility is non-negotiable — WCAG 2.1 AA

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

### 5. Coming-soon routes must be noindex

Every coming-soon route sets `robots: { index: false, follow: true }` via
`buildMetadata({ noIndex: true })`. There are no unbuilt pages left, so no
page uses it for that reason any more - but the three account screens use it
for a different one. See **The account screens**.
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

### 6. Null content renders nothing

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

### 7. No external assets, no third-party scripts

- No external image URLs, no placeholder image services, no `<img>`. Where real
  imagery will go, render a token-coloured gradient block marked `image-slot`
  or `image-slot-soft` (see `globals.css`).
- No analytics, cookie banners, chat widgets or third-party scripts.
- No `localStorage` or `sessionStorage`.
- No invented client logos, testimonials, named people, statistics or
  figures of any kind — see **Content rules** above.

## Routes

Nothing is coming soon any more: every route is built. `comingSoonRoutes` in
`content/navigation.ts` is empty and the shared `ComingSoon` component has no
callers. Both are kept as the mechanism for the next unbuilt section rather
than deleted and rebuilt later.

### Deleted routes

`/industries`, `/specialties` and `/research` were removed, not hidden.

- `/industries` and `/specialties` described the three desks, which are
  built at `/employers#specialties` and rendered again on `/about` and
  `/job-seekers` from the same `taxonomy.ts` data. Nothing linked to either.
- `/research` was a hiring index: demand, time to fill, compensation
  movement. That is a statistics product, and the content rules do not allow
  statistics anywhere on this site. It could not have been built as
  described.

All three were noindex and unlinked, so **no redirects were added and none
are needed** - nothing external can be pointing at a URL that was never
indexed and never linked.

The Insights dropdown is down to two items, Articles and FAQ, because
"Research & Hiring Index" went with the route and "Salary Guides" was a
second entry pointing at `/resources` under a name that page will never
earn. Left as-is rather than restructured.

Plus a custom `app/not-found.tsx`.

Adding a coming-soon route: add an entry to `comingSoonRoutes` in
`content/navigation.ts`, then create `app/(marketing)/<path>/page.tsx` from any existing
coming-soon page (they are all the same four-line stub).

## The job board

**It ships with zero jobs, and that is a real state, not a broken one.**
`getJobs()` in `src/features/jobs/queries.ts` returns `[]`; `/jobs` renders an honest
empty state that routes employers to the requisition form. It offers job
seekers no route onward: the resume form is unlinked under the release gate,
and the site publishes no contact channel to point them at instead
(CLIENT-CONFIRM.md items 3 and 8).
The full list and filter UI is built and sits behind that check, so postings
appear with no code change. Filters render only when there is at least one
job.

**Never add a sample, example or illustrative posting.** Not to see the
layout, not "just for now". A fabricated JobPosting carrying structured data
can get the whole domain removed from Google for Jobs, and a candidate who
applies to an invented role has been lied to. Fixtures live in
`src/features/jobs/jobs.fixture.ts`, which only `*.test.ts` imports, so nothing
reaches the build. Every fixture id and slug contains `DO-NOT-SHIP-FIXTURE`
so one grep proves it:

```bash
npm run build && grep -r "DO-NOT-SHIP-FIXTURE" .next   # must print nothing
```

**Pay range is required by the type.** `Job["pay"]` is not optional. Several
states mandate a posted range, and the positioning of this site is that every
role shows one. If an upstream system can return a posting without a range,
the mapping layer drops it or fails - it does not make the field optional.

**`hiringOrganization` is always Talentrax Global, never a client.** The
detail page passes `site.name` and `SITE_URL` into `jobPostingJsonLd()`, and
that is the only organization a posting may carry. The `Job` type has no
employer or client field, and none is to be added. The site deliberately
says nothing about when, or whether, a candidate learns which employer a
role is for (see `consentBeforeSubmission` in `content/commitments.ts`, and
do not reintroduce that claim anywhere), so a posting that named the client
in its markup would disclose in structured data what no page says. If an
upstream system supplies a client name, the mapping layer drops it.

**Structured data.** `src/features/jobs/job-posting-schema.ts` builds the schema.org
JobPosting, and it is the one thing here with real unit tests (`npm test`),
because JSON-LD fails silently: a malformed payload does not throw, the
posting simply never appears. `/jobs` itself emits **no** JSON-LD while the
board is empty - an ItemList of nothing is a claim we have listings - and
`npm run check:seo` asserts that.

**What check:seo can assert about `/jobs/[slug]` today**: that an unknown
slug returns 404, and that no posting URL has leaked into the sitemap while
`getJobs()` is empty. That is all there is to check against zero postings.

**The check:seo assertions to add when real postings exist** are listed in
the `wire-expired-postings` skill.

### /locations — no market list, and no per-state pages

The page answers "can you help me where I am, and how does location work on
these roles". It does **not** list markets, cities, states, regions or
offices, and it carries no map and no count of coverage areas.

**Do not add per-state or per-city sub-routes.** Location landing pages are
only worth having with real differentiated content - the employers and role
types that market actually has. A state name swapped into a template is a
thin page, and fifty of them is the thin-content problem `/specialties` was
deleted over. CLIENT-CONFIRM.md item 13 asks the client which markets they
know enough about to justify a real page, not which states to generate.

**No regulatory detail.** Licensure and multistate arrangements are named as
things that shape a clinical role, and the posting is named as the authority
for any given role. The page must not list compact member states, claim which
licences transfer where, or characterise the rules of any licensing board.
Those change, the page would not, and being wrong about licensure on a
healthcare staffing site is worse than saying nothing. The disclaimer
paragraph in `content/locations.ts` stays.

### The insights index

Forty articles, imported from the client's `.docx` files by
`scripts/import-articles.ts` into `src/content/articles/`, one typed file
per article plus a generated index. `getArticles()` in `src/features/articles/queries.ts`
returns them newest first, `/insights/[slug]` generates one page each, and
the sitemap lists them. The empty state still works: if the source is ever
empty again the index renders it, and `check:seo` fails, on purpose, until
someone decides that is intended.

**Order is an explicit slug list, not the date.** Every article carries the
same import date, so `sortArticles()` ranks by `src/content/article-order.ts`
(the client's scheduled month per document, newest first). Do not sort by
`datePublished` until the articles carry real, distinct dates. A hand-owned
list rather than an `order` field, because the article files are regenerated
on every import. `npm test` fails if the list and the imported articles
differ, so a new import has to be placed before it builds.

**No date is displayed on any article** - not on the `/insights` cards, the
full page or the modal. The dates in the data are import timestamps, not
publication dates, and showing them made the order look broken: ten
articles dated later sat below thirty dated earlier. `datePublished` and
`dateModified` stay in the data and in the BlogPosting JSON-LD, which needs
them; readers do not. **Dates return to the UI when the client supplies a
real publication schedule** - CLIENT-CONFIRM.md item 17.

The importer compares an existing article file with its regenerated text
after normalising line endings on both sides, and moves `dateModified` only
when that differs. With `core.autocrlf=true` a raw comparison saw every
checked-out CRLF file as changed and bumped every date. Its report lists the
articles whose content changed; a re-import of unchanged sources lists none.

**The home page rail** (`components/marketing/home/LatestArticles.tsx`) shows the
first six of that same order and links on to `/insights`. Cards are title
and summary only, and link to the full page; only the index intercepts into
the modal. `check:seo` asserts the six cards are in the server HTML, match
the index's first six, and resolve. The behaviour below is
`components/ui/ScrollRail.tsx`; its header comment is the authority, and
this section describes the code as it is.

**Three sets, one real.** `LatestArticles` renders the six cards three
times: `before`, `real`, `after`. The two copies carry `data-rail-copy`,
are `aria-hidden`, their links are `tabIndex -1`, and they are `hidden`
until hydration sets `data-infinite` on the rail. So the server HTML shows
six cards, and Tab reaches six links plus the rail itself (a focusable
region, so the arrow keys scroll it). `inert` is not used: a copy card
under the pointer must still take a click. The rail is infinite whether or
not it drifts, reduced motion included.

**No visible scrollbar** (`.scrollbar-hidden`). It scrolls by touch, wheel,
trackpad and keyboard, and the visible manual controls are **Previous and
Next** buttons. They move one card's pitch, never disable, and pause the
drift like any other manual scroll. The header row, in tab order, is "All
articles", Previous, Next, Pause - all before the rail they control.

**The invariant: `scrollLeft` stays within the middle set,
`[setWidth, 2 x setWidth)`.** `setWidth` is measured live from layout each
time it is needed: the distance from the first card of set one to the first
card of set two, unrounded (`getBoundingClientRect`, not `offsetLeft`). The
sets are identical, so moving by exactly one `setWidth` lands on the same
content. **Everything that repositions the rail:**

1. **Parking, on first appearance** (ResizeObserver on `clientWidth`):
   `scrollLeft = setWidth`, the first real card.
   **On every later change of the rail's width the visitor keeps their
   place.** The set is re-measured and the live `scrollLeft` is mapped
   across as the same fraction of a set: `scrollLeft / oldSetWidth x
   newSetWidth`, folded into the middle set. That covers a phone rotation,
   a resize, zoom, and a classic scrollbar appearing or disappearing (a
   drawer or dialog locking the page). The rail is as wide as the page
   container, capped at `max-w-7xl` (1280 CSS px), so this fires only
   while the viewport is narrower than that. Resetting to the first card
   here was a bug, not a policy.
2. **Every drift frame:** next = current + carry + 35 px/s x elapsed
   (elapsed capped at 100 ms); at or past `2 x setWidth` it subtracts one
   `setWidth`, below `setWidth` it adds one. A frame writes only if
   `scrollLeft` is within 1px of the value it last wrote; otherwise the user
   moved it, and that frame writes nothing.
3. **When a user's scroll comes to rest** (`scrollend`), if it is outside
   the span it moves by one `setWidth`, back inside. Skipped while keyboard
   focus is inside the rail. **Nothing repositions during a user's scroll.**
4. **When focus leaves the rail**: the scroll-end recentre that waited for
   it.
5. **Previous or Next**: if one card's move would leave the span, first an
   instant one-`setWidth` shift, then a one-card `scrollBy`, smooth unless
   reduced motion.
6. **Keyboard focus on a card**: `scrollIntoView({ inline: "nearest" })`,
   because browsers do not scroll a focused element that is already partly
   visible.

**No position state.** The live `scrollLeft` is the only truth. Two values
carry between frames, and neither is a position: the value the rail last
wrote (to tell its own scroll events from the user's, with 1px tolerance
for the device pixel grid) and a sub-pixel `carry` the browser's rounding
would otherwise eat. One more carries between layouts: the previous set
width, which is geometry - the scale the live `scrollLeft` was laid out
in - and is what a width change maps from. Do not reintroduce a position,
origin or cached offset.

**The focus ring outlines the whole card.** A card is one link whose
`::after` covers it; `.stretched-link` in `globals.css` moves the global
ring onto that box (same width and colour, inset by its width so the
rail's overflow cannot clip it). The ring is moved, never removed.

**Snap is off whenever the rail can drift, paused included** - switching it
on at a press snapped the rail away from where the user put it. Snap is on
only under reduced motion.

**What stops the drift.** Any one of these stops the frame loop outright,
and a resume carries on from wherever the rail is:
- **the pause button** (WCAG 2.2.2): a real `<button>`, icon-only, named by
  aria-label for what it will do, never hover-only. Once pressed it stays
  paused; it never auto-resumes.
- **a mouse or pen moving over the rail**, by non-zero movement. A pointer
  the page scrolled underneath does not count.
- **keyboard focus inside the rail** (`:focus-visible`).
- **a manual scroll**: a mouse or pen press on the rail, a sideways wheel or
  trackpad swipe, Previous or Next, or any scroll the rail did not write.
  Held until the pointer or focus leaves the whole control (header row and
  rail), or the rail leaves the viewport. A press dragged off the control
  holds until the button comes up. The card links are `draggable={false}`:
  the browser's native link drag cancelled the pointer mid-press, and the
  drift resumed under a held button.
- **a touch** on the rail or on Previous or Next, held until the rail
  leaves the viewport: a finger has no "leave".
- **the rail off-screen**, or **the tab hidden**.

A vertical wheel is the page scrolling and does not pause it: it did once,
and the rail never moved for anyone who scrolled down with a mouse. Under
`prefers-reduced-motion: reduce` the drift never starts, the pause button
is hidden, and Previous and Next move instantly. **Removing the pause button
makes the section fail WCAG 2.2.2**; restyle it, do not remove it. Removing
any stop condition is a regression, not a tweak. No dots, counters or slide
indicators. It sits between the split section and how it works, on the
muted tone; how it works moved to the default surface so the alternation
holds.

**Every article is imported, never typed in.** The importer is the only way
content enters `src/content/articles/`; the files say so in their header and
the next import overwrites them. A fix to an article is a fix to the source
document followed by a re-import. Hand-copying is how figures drift.

**Run it over every source folder at once.** The forty articles come from
two bundles - the thirty healthcare and hiring articles and the ten non-IT
articles - and a run sees only the folders it is given:

```bash
npm run import:articles -- <healthcare-folder> <non-it-folder>
```

**Never run it over a single folder expecting a clean result.** It deletes
nothing by default: an article whose document is not in the input is
reported as "not in input, kept" and stays in the index and as a link
target, so a one-folder run is harmless but incomplete. Deleting takes
`--prune`, which lists the slugs, asks for confirmation and refuses in a
non-interactive run. It also refuses outright when it would remove more
than a quarter of the existing articles, because that is what a
one-folder `--prune` looks like: thirty live URLs deleted behind a
correct-looking run. Do not raise that threshold to get past it; pass both
folders.

**What the importer strips, keeps and resolves is in the header of
`scripts/import-articles.ts`.** Two decisions live here because they are
not derivable: every stated date was in the future at import, so an article
carries the import date and its `datePublished` is preserved across
re-imports; and the planning documents in the client's bundle are skipped
and **must not be committed** (`*.docx` and root zips are gitignored).

**No author field exists on the Article type**, and `article-schema.ts` emits
no `author`. Nobody has been named anywhere on this site; adding the field is
what invites a byline to be invented to fill it. The source documents carry
a bracketed byline placeholder and the importer drops it.

**The body is structured blocks**, not an HTML string - paragraph, heading
(levels 2 and 3), list (ordered or not) and table (header row plus rows),
with inline links as offset marks rather than tags. A CMS swap stays a
mapping exercise, and nothing is ever handed untrusted markup to render.
There is deliberately no quote block: a pull quote from a named person is a
testimonial with better typography.

**One renderer.** `features/articles/components/ArticleBody.tsx` renders everything
under an article's title - the key-takeaways card, the blocks, the FAQ
block, the sources as visible links, the related reading - for both the
full page and the modal, so the two cannot drift. Tables are real `<table>`
markup in a keyboard-reachable horizontal scroll region; **no charts, and
no table is ever turned into a graphic**: the figures are cited and read
exactly as written.

**Structured data.** One BlogPosting per article from `article-schema.ts`,
and one FAQPage from `faq-schema.ts` when the article has FAQs, generated
from the same array the page renders. An article without FAQs emits no
FAQPage. `/insights` itself emits none.

### The article modal

Clicking a card on `/insights` opens the article in a dialog **and** changes
the URL to `/insights/<slug>`. That is a Next.js intercepting route in a
parallel slot, and the file layout is the whole mechanism:

```
app/(marketing)/insights/(index)/layout.tsx              renders {children} and {modal}
app/(marketing)/insights/(index)/page.tsx                the index, /insights
app/(marketing)/insights/(index)/@modal/default.tsx      null: the closed state
app/(marketing)/insights/(index)/@modal/(.)[slug]/page.tsx   the intercepted article
app/(marketing)/insights/[slug]/page.tsx                 the full page, unchanged
```

- **Only the index intercepts, and `src/proxy.ts` is what makes that
  true.** The slot lives in a route group holding only the index page, but
  the file layout alone does not narrow the match: Next decides
  interception from the `Next-Url` header of a soft navigation, and its
  rewrite matches the intercepting path **and every descendant**
  (`/insights(?:/.*)?`, in `next/dist/lib/generate-interception-routes-rewrites.js`).
  A full article page is a descendant, so its related-reading links opened
  the modal over an index that was not there - a dialog over an empty page,
  no `<h1>`. The proxy, the site's only one (its other job is refreshing
  the staff session on `/staff`), strips `Next-Url` from a soft
  navigation to `/insights/<slug>` unless it starts on `/insights`, so
  every other article link is an ordinary navigation to the full page.
  That includes a related link **inside** the modal: it now opens the full
  page rather than swapping the dialog's article. The matcher requires the
  header, so crawlers, direct visits, reloads and `check:seo` never reach
  it. Do not move the layout up to `app/(marketing)/insights/`.
- **Two independent protections, and neither is redundant.**
  1. **The proxy** (above) stops the intercept firing anywhere but the
     index. It depends on the host: the proxy has to run, and the host has
     to forward the request with the header removed. `next start` does;
     Netlify runs it in an edge function, which is trusted, not tested.
  2. **The backstop in `ArticleModal`**: before `showModal()`, it checks
     for the index's marker (`insightsIndexMarker`, on the index page's
     content in both the list and the empty state). With no index beneath
     it, it does `location.replace()` of the same URL instead - a full page
     load, which never intercepts, so the result is the full article page.
     It depends on nothing but the DOM.

  If the header is simply lost (a CDN strips `Next-Url`), Next serves the
  ordinary page and neither is needed. The case they exist for is the
  reverse: the header arrives intact and the proxy did not act on it. Then
  the server intercepts, and without the backstop the visitor gets a dialog
  over an empty page with no `<h1>`. `tests/browser/insights-modal.spec.ts`
  forces exactly that (every `Next-Url` rewritten to `/insights`) and
  asserts a full page; it fails with the backstop removed. **Delete
  neither**: the proxy keeps the bad case from happening, the backstop
  keeps it from showing.
- **A crawler, a refresh, a shared link and a direct visit get the full
  page.** `(index)` and `@modal` are not URL segments, so a hard request
  for `/insights/<slug>` renders `app/(marketing)/insights/[slug]/page.tsx` with its
  JSON-LD, and `check:seo` keeps asserting exactly that by curl. The
  intercepted route emits no structured data because nothing that indexes
  can reach it.
- **Back closes it.** Opening is a pushed history entry; the close button,
  Escape and the backdrop all call `router.back()`, which is the same thing
  the browser's back button does. The index stays mounted underneath the
  whole time, so its scroll position is intact when the dialog goes.
- **Focus returns to the card that opened it**, on every way out. The
  opener is stored when the dialog mounts; the unmount cleanup closes the
  dialog **before** focusing it, because while a modal `<dialog>` is open
  everything outside it is inert and `focus()` silently fails - React runs
  that cleanup before it removes the dialog's nodes. If the opener is gone,
  the card for the same slug takes focus. The next Tab reaches the next
  card, not the footer.
- **A reload of an open article starts at its top.** The article's history
  entry sets `history.scrollRestoration = "manual"`; restoration is per
  entry, so the index's own back/forward restoration is untouched.
- **The scroll lock releases in the commit that removes the dialog.** The
  body overflow is set and restored in a `useLayoutEffect`; that cleanup
  runs synchronously during React's commit, before the App Router's own
  layout effect resets or restores scroll. Every way out (back, close,
  Escape, a link inside the dialog, a navigation elsewhere) unmounts the
  component and passes through it. This is the lesson from the mobile
  drawer, whose passive-effect lock outlived the navigation. **Do not move
  the lock to `useEffect`, and do not add a second lock elsewhere.**
- **Readability beats the glass.** The surface under the article is solid
  `--color-surface`; `backdrop-filter` is on the chrome only (the
  `::backdrop` and the sticky bar), with an `@supports` fallback to solid
  where it is unavailable. The bar's worst-case background is measured in
  the comment beside `.article-modal` in `globals.css` (ink-muted 6.4:1).

**Never add a sample article.** The home page shipped three invented article
cards once and they had to be torn out. Fixtures live in
`src/features/articles/articles.fixture.ts`, imported only by `*.test.ts`, and carry the
same `DO-NOT-SHIP-FIXTURE` sentinel as the job fixtures, so one grep covers
both.

`npm test` runs over the real articles: unique clean slugs, no placeholder
or internal note, no capital-R brand, https sources, related slugs that
exist, no skipped heading level, no future date. `npm run check:seo` asserts
that `/insights` links to at least one article and emits no JSON-LD, that
the sitemap lists exactly those articles, that an unknown slug 404s, and on
a sample of five articles: 200, canonical, indexable, one `<h1>`, a
BlogPosting that parses with every field and no author, and a FAQPage that
parses where one is emitted.

### Expired job postings

**A posting past `validThrough` must answer 410 Gone.** Not 404, and never a
redirect. What exists today, and the two ways to wire the 410 when real
postings land, are in the `wire-expired-postings` skill
(`.claude/skills/wire-expired-postings/SKILL.md`); the list of slugs comes
from `getRecentlyExpiredSlugs()` and nowhere else.

## The account screens

`/login`, `/register` and `/forgot-password` are built. They sign nobody in,
because there is no authentication backend, and every one of the rules below
exists because the safe version is cheaper to decide now than to retrofit.

**They are in the navigation, ahead of the backend.** `utilityNav` in
`content/navigation.ts` carries Sign In and Register, and the header and the
mobile drawer render them.

What keeps that honest is one plain sentence above each form saying the
feature is not open yet - `notOpenYet` in `content/auth.ts`. Someone should
not be able to reach a password field from the site navigation without the
page telling them it cannot do anything. **Those three lines are removed in
the same commit that wires the auth backend**, and not a commit earlier: they
are the only thing making a visible, unwired sign-in truthful.

The buttons stay operable and submitting stays honest - the seams return
`unavailable` and the page renders that. Nothing is disabled and nothing
pretends to have worked.

**Visible in the navigation is not the same as indexable.** These three are
real, linked pages that are nonetheless `noIndex` and absent from
`app/sitemap.ts`. Being reachable by a visitor and being listed in search
results are separate decisions, and this is the route group where they come
apart. `check-seo.sh` has a third route
list, `UNLISTED_ROUTES`, that asserts both halves: each returns 200 **and**
carries noindex **and** is not in the sitemap. A future edit that makes one
indexable fails there.

**`/job-seekers/upload-resume` is in that list too**, for a different reason:
the release gate in CLIENT-CONFIRM.md. It is reachable by URL and linked
from no page - not the navigation, the footer, a CTA, an intent card or the
sitemap. Relinking it is the decision the gate guards.

**Candidate accounts only.** Employer accounts are created by the Talentrax
team. There is deliberately no account-type selector on `/register` - a
self-service route to an employer account is a privilege question dressed up
as a form field.

### Security rules, decided now and not later

These are not placeholders to be relaxed when the backend lands.

1. **Never disclose whether an email has an account.** Not on sign-in, not on
   registration, not on password reset. Every outcome message is generic and
   identical across cases - "If that email has an account, we have sent it a
   reset link", always. A registration form that says "that email is already
   taken" enumerates a candidate database just as loudly as a login error
   does. The copy in `content/auth.ts` is written that way; do not
   "improve" it. When the endpoints exist they must also take the same time
   over both cases, or the message is decoration over a timing side channel.

2. **No client-side authentication state, ever.** No `localStorage`, no
   `sessionStorage`, no cookie written from JavaScript, no `isLoggedIn` flag.
   A session is an HttpOnly cookie the server sets. A client-side flag is not
   a placeholder for one - it is a thing an attacker types into a console,
   and it invites UI that trusts it.

3. **Nothing in `src/features/auth/queries.ts` is logged.** The other three form seams
   console.log their payload; these must not. A password in a console log is
   a password in a log, "the payload minus the password" still pairs an email
   with an authentication attempt, and a length or a hash is still
   information about the password. Use a breakpoint.

4. **`autoComplete` is load-bearing**: `email`, `current-password` on
   sign-in, `new-password` on both register fields. Password managers depend
   on it, and people with password managers have better passwords.

5. **No strength meter, no social sign-in, no "remember me".** The first
   scores a password against rules nobody has set. The second is an
   integration nobody has chosen. The third is a session-lifetime decision
   the backend has not made - CLIENT-CONFIRM.md item 14.

6. **No honeypot or minimum-time check on these forms**, unlike the other
   three. A password manager fills a sign-in form faster than a human can, so
   a time check punishes the people doing it properly, and credential
   stuffing is stopped by server-side rate limiting, which a hidden input
   cannot do.

## Staff sign-in

`/staff/sign-in`, then `/staff/sign-in/set-up` (first time) or
`/staff/sign-in/verify`, then `/staff`. Built in step 6. The candidate
screens above are untouched and still sign nobody in.

- **Unlisted.** Noindex, out of the sitemap, linked from nothing:
  `check:seo` asserts `/staff/sign-in` in `UNLISTED_ROUTES`, that `/staff`
  with no session redirects to it, and that no built page links into
  `/staff`.
- **TOTP is required.** A staff account with no verified factor reaches
  setup and nothing else; one with a factor reaches the code step. The QR
  code is redrawn from module coordinates (`features/auth/totp-qr.ts`): no
  markup from Auth reaches the page, and there is no `<img>`. The key is
  always shown as text too.
- **The database holds the same line** (migration 14): a staff role counts
  only when the session's JWT says `aal2`. A password alone, used straight
  against the API, reads the caller's own profile row and nothing else.
  employer_user and job_seeker are unaffected. Every pgTAP harness signs in
  at `aal2`; `70_staff_sign_in.test.sql` checks aal1.
- **Every page and every action checks for itself**, through
  `getStaffAccess()` in `features/auth/queries.server.ts`. The `(internal)`
  layout only draws `StaffChrome`: a layout is not a guard. `staffPathFor()`
  sends anyone at the wrong step to the right one. The proxy refreshes the
  session on `/staff` routes and decides nothing.
- **The session cookie is scoped to `/staff`**, HttpOnly, Secure,
  SameSite=Lax (`SESSION_COOKIE` in `lib/supabase/server.ts`). It is the one
  cookie the site sets, and `/privacy-policy` says so.
- **Attempts are limited per address, in the database**: five password or
  code attempts in fifteen minutes (`private.sign_in_settings`), counted on
  an HMAC of the address, any string alike. Supabase Auth's own per-IP limit
  cannot do this, because it sees our server's address for every staff
  member. Passing the second factor clears the count. Anyone can spend an
  address's attempts and lock it for the window; that is the accepted cost
  of any per-account limit.
- **Every refusal reads the same and takes the same time**: a wrong
  password, an unknown address, a non-staff account (signed straight out
  again) and a locked address all answer after at least 1.5 seconds with
  `staffSignIn.failed`.
- **No reset in the app**, for passwords or factors, for any role. A lost
  factor goes by `supabase/STAFF-ACCESS.md`.
- **Nothing is logged**, as on the account screens.

## Two pages that constrain what may be written on them

### /accessibility — never claim conformance

Nothing on this site has been operated in a browser by whoever built it: no
keyboard run-through, no screen reader, no zoom or reflow testing, no
independent audit. So the page says the site is **built to aim at** WCAG 2.1
Level AA, lists what is actually implemented, and states plainly that it has
not been audited or tested with assistive technology.

**Do not add the words "compliant", "conformant" or "conforms" to that page**,
and do not add a date, a version or a "last reviewed" line. All of those are
claims, and a false accessibility claim in the US is what demand letters are
made of. The admission that no audit has happened is the most valuable
sentence on the page; it goes when an audit report replaces it, and not
before. CLIENT-CONFIRM.md items 11 and 12.

### /resources — two subjects, and no numbers

Interview preparation and resume guidance. **Not salary guides, compensation
benchmarks, market rates or pay data of any kind** - that is the
no-statistics rule, and narrowing the page to two subjects is what the rule
left standing. The nav advertised it as "Salary Guides" once; it is not that
page.

There are **no numbers on it at all**, not even a file size. Most resume
advice in circulation is a made-up statistic ("six seconds on a resume",
"70% are filtered"), and the rule forbids them whether or not they happen to
be true.

**No attributed claims.** Nothing there may say "our recruiters find that",
"in our experience" or "studies show". Nobody at the client has told us what
their recruiters observe. It is written as guidance the firm publishes - what
to do, not what someone noticed. No byline, no named people, no downloads.

### /faq — every answer is sourced from elsewhere on the site

No answer on `/faq` may assert anything that is not already true on another
page. Each one restates content from `/employers`, `/job-seekers`, `/about`,
`/privacy-policy`, `taxonomy.ts` or `commitments.ts`, and links to it.

A question with no answer in the repo does **not** get one written for it -
it goes to CLIENT-CONFIRM.md item 10 and stays off the page. No commercial or
fee questions at all while those terms are unagreed.

The FAQPage structured data is generated from the same array the page
renders (`src/lib/faq-schema.ts`), so the markup cannot drift from the
visible answers - which is the rule Google actually enforces on FAQPage.

## One wording for a promise

`src/content/commitments.ts` holds the operational promises - a named
recruiter per search, consent before any resume moves, a search plan before
sourcing, an answer either way, and the rest. `/about`, `/employers` and
`/job-seekers` all render objects from that file; none of them writes its own
version.

They were duplicated once, worded for two audiences, and that is how a
business ends up making two different promises. **A promise that appears on
more than one page belongs here, phrased so it reads to either audience.**
Each one commits someone to doing something on every search, so adding one is
not a copy decision - see CLIENT-CONFIRM.md item 10.

## Unanswered client questions

`CLIENT-CONFIRM.md` at the repo root lists every fact the build could not
derive from its own code: retention periods, named processors, the
data-rights contact address, international transfers, governing law, and the
commercial terms behind `/employers/services`.

**None of them is written into a page as a guess or a placeholder.** The
sentence that would carry each one is absent, and where that empties a
section the section is gone too (rule 6). Every omission is marked with an
`OMITTED` comment in `src/content/legal.ts`, or a `detail: null` in
`src/content/taxonomy.ts`, pointing at its numbered question.

That file also carries a release gate: **`/job-seekers/upload-resume` must
not be publicly reachable until the privacy items are answered and the policy
has been through the client lawyer review.**

## The ATS schema

`supabase/migrations/` is the source of truth for the ATS database; nothing
is created in the dashboard. How to run it, the design decisions and what is
deliberately missing are in `supabase/README.md`. The rules that bind every
future migration:

- **Applications and submissions are different tables.** An application is a
  candidate's own act; a submission is Talentrax putting them forward.
- **The consent and approval gate is a CHECK constraint** on `submissions`:
  nothing reaches an employer without candidate consent and either a BDM
  approval or a sanctioned direct submission. Do not move it into a policy
  or the application.
- **A job cannot exist without a pay range**, and `is_test` defaults true.
- **RLS on every table, no DELETE policy anywhere, anon SELECT on nothing.**
  Soft delete only. The audit log is append-only for every role.
- **Every policy reads role through `private.*` helpers.** Entity
  visibility is defined once, in a `private.can_*` function.
- **Employers read three views, never base tables.** RLS filters rows, not
  columns.
- **The audit log never holds personal data.** Every string-like column of
  a new table must be classified in `private.column_classification`, or
  `00_schema.test.sql` fails; an unclassified column is redacted anyway.
- **Erasure goes through `deletion_requests`, never an ad hoc DELETE.** A
  new table holding candidate data needs a line in `private.erase_candidate`
  and a row in `supabase/ERASURE.md` saying whether it is erased,
  anonymised or kept, and why. Retention periods live in `retention_rules`
  with their citations, never in code, and so do the kinds of record each
  rule covers. The floor is computed per rule from the candidate's live
  records of those kinds; the candidate row is not one. A stored
  `deferred_until` is what the candidate is shown, never the gate. A new
  table holding a qualifying record needs a kind in `retention_floor()`.
- **Every stored file is named by a row, and originals and scrubbed copies
  live in separate buckets.** No storage policy may admit a path that no
  row names, and none may allow UPDATE or DELETE on `storage.objects`.
  `supabase/STORAGE.md` is the access matrix.
- **An intake row is real unless shown otherwise.** `is_test` on the three
  intake tables defaults false, the opposite of `jobs`: hiding a real
  candidate costs more than showing a test row. On an end user's insert it
  is computed from the address alone (reserved test domains), and staff
  mark the rest. **Whether a resume arrived is the upload endpoint's word
  only** (migration 11, `supabase/STORAGE.md`); no end user can write it.
- **The public forms are rate limited in the database, and a retry is never
  counted.** When a form is wired to the database, it sends a
  `submission_key`: generated once per submission, resent on every retry.
  Contact and Request Talent do; the resume seam does not yet. A per-email limit holds,
  it never refuses: a refusal would disclose that someone used the form. Thresholds live in `intake_limits`,
  never in code.

`supabase/tests/database/` asserts all of it with pgTAP, including catalog
checks that fail when a new table forgets RLS, the standard columns, the
soft-delete policy or an index on a foreign key. Run them before committing
a migration.

**Local first.** `supabase/LOCAL.md` is the workflow: `db:start`,
`db:reset`, `db:test`, `db:types`, `db:stop`, the seeded logins, and the
documented (not executed) path to hosted. After every migration, run
`npm run db:types` and commit `src/lib/database.types.ts` with it; a stale
types file compiles against columns that no longer exist. `seed.sql` never
reaches a hosted project.

**A lost staff second factor is reset by the runbook in
`supabase/STAFF-ACCESS.md`, and only by it**: a person with project access
runs the SQL, a `super_admin` approves, neither is the person asking, and
identity is proven by a call back to a number on file plus a live video or
in-person check. Staff MFA (build step 6) implements that path. It must not
add a factor reset to the app, for any role.

The taxonomy tables are seeded from `src/content/taxonomy.ts`. Changing a
desk, specialty or engagement model there needs a matching migration and
an update to the values `00_schema.test.sql` pins, which are copied from that
file. Nothing reads the TypeScript at test time.

## SEO baseline

- Per-route unique title, description and canonical, all via
  `buildMetadata()` in `src/lib/metadata.ts`.
- `metadataBase` comes from `NEXT_PUBLIC_SITE_URL` with a localhost fallback
  (see `.env.local.example`).
- Organization + WebSite JSON-LD on the **home page only**, server-rendered.
- The 404 page does **not** set `robots`. Next.js injects
  `<meta name="robots" content="noindex">` on any page returning a 404, so
  setting it in `not-found.tsx` too emitted two tags and confused SEO audits.

`npm run check:seo` asserts all of this against a running server.

## Environment variables

Five variables. Templates: `.env.local.example` (the local stack's public
demo keys, committed on purpose) and `.env.production.example` (names only,
empty values). `supabase/LOCAL.md` documents them.

| Variable | If missing |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | falls back to `http://localhost:3000` - see below |
| `NEXT_PUBLIC_SUPABASE_URL` | each Supabase client throws when constructed, naming it |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | the service-role client throws when constructed, naming it |
| `APP_ENV` | `local` |

**The Supabase variables have no fallback and are checked at the point of
use**: `readSupabaseEnv()`, and the service-role key in `admin.ts`, run
when a client is constructed, never at import or build time. So every
build, Netlify's included, succeeds with no Supabase variables at all. Do
not move that check back into `next.config.ts` or module scope: it failed
every build that never needed the value, Netlify's and the local one
`check:seo` runs against.

**`SUPABASE_SERVICE_ROLE_KEY` is a runtime secret, not a build input.** It
is never `NEXT_PUBLIC_`. On Netlify it is marked secret and scoped to
Functions, so the build cannot see it at all.

**`APP_ENV` (`local` | `staging` | `production`) is what "deployed"
means.** It is set in the deploy environment only, never in
`.env.local.example`. With `staging` or `production`, a Supabase URL
containing `localhost` or `127.0.0.1` refuses to boot: `next.config.ts`
calls `assertDeployTarget()`, so `dev`, `build` and `start` all stop. An
unrecognised value refuses too. **Never key this on `NODE_ENV`**: `next
build` sets it to `production` on every laptop, which is how the first
version of this guard broke local production builds. Do not add an escape
hatch.

`NEXT_PUBLIC_SITE_URL` is a softer case: it has a localhost fallback
(`src/content/site.ts`), which makes it more dangerous, not less.

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
| Local | `.env.local` (gitignored; copy from `.env.local.example`) |
| CI | export before `next build` |
| Netlify | Site configuration → Environment variables, per context |

`netlify.toml` deliberately does not set any of them, so deploy previews and branch
deploys can carry their own origin instead of all claiming production's.

## Commands

The scripts are in `package.json`. `npm test` runs Node's built-in test runner directly over TypeScript - no
Jest, no Vitest, no transform step, no new dependency. It covers the job
board and its JobPosting schema, the imported articles and their BlogPosting
and FAQPage schemas, and the taxonomy. That is not under-testing by neglect:
those are the code here whose failure is silent and expensive.

`npm run test:browser` is the other half: a Playwright suite in
`tests/browser/` that builds, serves the production build with `next start`
and drives Chromium. It exists because the first real browser pass found six
defects that no unit test and no curl could see - focus lost after the
modal, the rail resetting on resize, a related link opening the modal over
an empty page - and every one of them has a test that failed before its
fix. Headless-safe except the `@headed` scrollbar test, which `CI=1`
skips and reports; `tests/browser/README.md` says which is which. Run it
before committing a change to the modal, the rail, the proxy or the
header and drawer. `@playwright/test` is pinned exactly, because the
browser binary it drives is versioned with it.

**That suite builds with no database** (`scripts/build-without-database.mjs`
blanks the two public Supabase values, which `.env.local` cannot then
override), so it runs on a machine with no stack, and it is where each wired
form's closed state is tested. **`npm run test:browser:db` is the `@db`
suite** (`playwright.db.config.ts`): it builds with `.env.local`, needs
`npm run db:start` first, submits the wired forms for real and reads back
what the database stored. Neither suite runs the other's tests. Run the
`@db` suite before committing a change to a wired form, its seam, the forms
gate or the intake migrations.

The `db:*` scripts wrap the Supabase CLI (a devDependency, so its version is
pinned); `supabase/LOCAL.md` documents them. There is **no CI** in this
repo, so nothing runs `db:test` for you.

`npm run build` runs `postbuild` after `next build`: `scripts/check-bundle.mjs`
(also `npm run check:bundle`), which fails the build if the service-role
key could reach a browser - see the top of this file. Netlify builds with
`npm run build`, so a leaking build never deploys. It reads the configured
key from the environment or `.env.local`, and also matches any
`service_role` JWT or `sb_secret_` key by shape, so it works with none set.

`import:articles` also runs on Node directly, with no dependency: the .docx
is a zip and `node:zlib` inflates it. It takes one or more directories the
documents are unpacked in (all of them - see **The insights index**), an
optional `--date YYYY-MM-DD` for the import date, and `--prune` to delete
articles missing from the input.

Test files import each other with explicit `.ts` extensions, which is why
`allowImportingTsExtensions` is set in `tsconfig.json`; Node requires the
extension. The runner resolves `@/` through `scripts/alias-hooks.mjs`
(`--import`, registered with `node:module`'s `registerHooks`), so a tested
module may import across folders by alias like any other code.

`check:seo` takes an optional base URL and expected origin. The two differ when
you serve a production build locally — the build is stamped with the real
domain while being served from localhost:

```bash
npm run check:seo -- http://localhost:3000 https://www.talentraxglobal.com
```
