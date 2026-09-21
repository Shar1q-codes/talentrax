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

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · React 19.

- Tailwind v4 is **CSS-first**: there is no `tailwind.config.js`. Theme tokens
  live in the `@theme` block in `src/app/globals.css`.
- Never hand-pin `next`, `react` or `react-dom` versions.
- No UI component library. Components are built in `src/components/`.

## Build status

Built: `/`, the three Employers routes, the two Job Seekers routes, `/jobs`
and its `/jobs/[slug]` detail route, `/about`, `/contact` and the two legal
routes (see **Routes**). Every other route renders the shared `ComingSoon`
component.
Those routes exist so navigation works and the URL structure is locked in
early.

The three forms - `/employers/request-talent`, `/job-seekers/upload-resume`
and `/contact` - are the only client components on the site.
Neither has a backend. Each submits through one swappable function that logs
its payload and returns success:

| Form | Seam |
| --- | --- |
| Request Talent | `submitRequisition()` in `src/lib/request-talent.ts` |
| Upload Resume | `submitApplication()` in `src/lib/job-seekers.ts` |
| Contact | `submitContact()` in `src/lib/contact.ts` |

Wiring a real endpoint is a change to that one file. The resume upload is
stubbed on purpose: the `File` rides in the payload, and the TODO spells out
the presigned-URL upload it needs instead of a multipart POST.

**Shared data.** `src/content/taxonomy.ts` holds the engagement models and
the three desks. Both sections render them and both forms build their
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
/                             /insights
/employers                    /insights/[slug]  (one per article: none today)
/employers/services           /locations
/employers/request-talent     /about
/job-seekers                  /contact
/job-seekers/upload-resume    /faq
/jobs                         /resources
/jobs/[slug]  (one per        /privacy-policy
              posting: none)  /terms
                              /accessibility
```

Built, but deliberately noindex and **absent from the sitemap**:

```
/login
/register
/forgot-password
```

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
`content/navigation.ts`, then create `app/<path>/page.tsx` from any existing
coming-soon page (they are all the same four-line stub).

## The job board

**It ships with zero jobs, and that is a real state, not a broken one.**
`getJobs()` in `src/lib/jobs.ts` returns `[]`; `/jobs` renders an honest
empty state that routes people to the resume form and the requisition form.
The full list and filter UI is built and sits behind that check, so postings
appear with no code change. Filters render only when there is at least one
job.

**Never add a sample, example or illustrative posting.** Not to see the
layout, not "just for now". A fabricated JobPosting carrying structured data
can get the whole domain removed from Google for Jobs, and a candidate who
applies to an invented role has been lied to. Fixtures live in
`src/lib/jobs.fixture.ts`, which only `*.test.ts` imports, so nothing
reaches the build. Every fixture id and slug contains `DO-NOT-SHIP-FIXTURE`
so one grep proves it:

```bash
npm run build && grep -r "DO-NOT-SHIP-FIXTURE" .next   # must print nothing
```

**Pay range is required by the type.** `Job["pay"]` is not optional. Several
states mandate a posted range, and the positioning of this site is that every
role shows one. If an upstream system can return a posting without a range,
the mapping layer drops it or fails - it does not make the field optional.

**Structured data.** `src/lib/job-posting-schema.ts` builds the schema.org
JobPosting, and it is the one thing here with real unit tests (`npm test`),
because JSON-LD fails silently: a malformed payload does not throw, the
posting simply never appears. `/jobs` itself emits **no** JSON-LD while the
board is empty - an ItemList of nothing is a claim we have listings - and
`npm run check:seo` asserts that.

**What check:seo can assert about `/jobs/[slug]` today**: that an unknown
slug returns 404, and that no posting URL has leaked into the sitemap while
`getJobs()` is empty. That is all there is to check against zero postings.

**Add when real postings exist**, against a live posting URL:

- exactly one `<script type="application/ld+json">`, and it parses;
- `@type` is `JobPosting`, with `title`, `description`, `datePosted`,
  `validThrough`, `hiringOrganization` and `jobLocation` all present;
- `baseSalary` is present with a min, a max and a `unitText` - the pay range
  is the promise this site makes, and the type enforces it in code, so the
  served HTML should be checked too;
- `validThrough` parses and is in the future;
- the posting appears in the sitemap, and an expired one answers 410.

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

Same machine as the job board, same rule. `getArticles()` in
`src/lib/insights.ts` returns `[]`, `/insights` renders an honest empty
state, and `/insights/[slug]` generates zero pages. The list UI sits behind
the check and appears when articles do. No category or tag filters until
there is something to filter.

**Never add a sample article.** The home page shipped three invented article
cards once and they had to be torn out; an invented article at its own URL
with BlogPosting markup attached is the same mistake with a search engine
repeating it. Fixtures live in `src/lib/insights.fixture.ts`, imported only
by `*.test.ts`, and carry the same `DO-NOT-SHIP-FIXTURE` sentinel as the job
fixtures, so one grep covers both.

**No author field exists on the Article type**, and `article-schema.ts` emits
no `author`. Nobody has been named anywhere on this site; adding the field is
what invites a byline to be invented to fill it. If real attribution is
wanted later that is a decision to take deliberately.

**The body is structured blocks**, not an HTML string - paragraph, heading,
list. A CMS swap stays a mapping exercise, and nothing is ever handed
untrusted markup to render. There is deliberately no quote block: a pull
quote from a named person is a testimonial with better typography.

`npm run check:seo` asserts that `/insights` emits no JSON-LD, that an
unknown slug 404s, and that nothing under `/insights/` has reached the
sitemap. The BlogPosting assertions that matter get added when an article
exists to run them against.

### Expired job postings

**A posting past `validThrough` must answer 410 Gone.** Not 404, and never a
redirect: 410 is the signal Google treats as definitive removal, and anything
softer leaves a dead job in the index for weeks.

What exists today:

- `isExpired(job, now)` in `src/lib/jobs.ts`, unit tested at the day
  boundary.
- `generateStaticParams` filters expired postings, so one never gets a page.
- The detail page calls `notFound()` as a backstop for a posting that
  expires between builds.
- `getRecentlyExpiredSlugs()` returns the slugs the 410 layer needs, since
  `getJobs()` no longer returns them.
- The sitemap lists live postings only.

**What is not wired, and why.** A page component cannot set a status code in
Next, so a real 410 has to come from middleware or a host rule - both of
which are server code, and this repo is deliberately backend-free (see the
top of this file). That is a decision to take deliberately rather than by
accident, so it is deferred until there are postings that can expire. With
`getJobs()` returning nothing, nothing can. When jobs land, wire ONE of:

1. `src/middleware.ts` matching `/jobs/:slug`, answering 410 for anything in
   `getRecentlyExpiredSlugs()`; or
2. generated `[[redirects]]` in `netlify.toml` with `status = 410`, built
   from the same list.

Whichever, the list comes from `getRecentlyExpiredSlugs()` and nowhere else.

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

3. **Nothing in `src/lib/auth.ts` is logged.** The other three form seams
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
npm test          # unit tests (node --test, no framework)
npm run check:seo # assert the SEO invariants against a running server
```

`npm test` runs Node's built-in test runner directly over TypeScript - no
Jest, no Vitest, no transform step, no new dependency. It covers
`src/lib/jobs.ts` and `src/lib/job-posting-schema.ts` only. That is not
under-testing by neglect: those two are the only code here whose failure is
silent and expensive. Everything else is content and layout, where a mistake
is visible on the page.

Test files import each other with explicit `.ts` extensions, which is why
`allowImportingTsExtensions` is set in `tsconfig.json`. Both tested modules
avoid value imports so the runner needs no path-alias resolver.

`check:seo` takes an optional base URL and expected origin. The two differ when
you serve a production build locally — the build is stamped with the real
domain while being served from localhost:

```bash
npm run check:seo -- http://localhost:3000 https://www.talentraxglobal.com
```
