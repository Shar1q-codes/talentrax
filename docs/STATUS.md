# Project status

**Sections 2, 3 and 4 describe `621a38a`** (build step 6, staff sign-in),
regenerated 2026-10-02. Every other section names the commit it describes;
anything older than the branch's head is stale by that much.

Derived from the repository: git, the file tree, the tests, CLAUDE.md,
CLIENT-CONFIRM.md and `supabase/*.md`.

**[conv]** marks a fact that is known only from the working session that
produced this file and is **not recorded anywhere else in the repo**.

| Sections | Describe |
| --- | --- |
| 2, 3, 4 | `621a38a` |
| 1 (branch state) | `fba7834`, before `feat/ats-foundation` was pushed. It has been pushed since |
| 5, 6 | `fba7834` |
| 7.1 to 7.3 | `5796955`. 7.2 is superseded: Contact and Request Talent are wired (section 2) |
| 7.4 to 7.8 | `fba7834` |
| 7.9 | `ff56050` |
| 8 | `fba7834`. Section 3 gives the checks for `621a38a` |

---

## 1. Branch state

`origin` = `github.com/Shar1q-codes/talentrax`, fetched 2026-10-02.
`origin/main` = `fc81c2e` (Merge PR #2).

| Branch | HEAD | Pushed | vs `origin/main` |
| --- | --- | --- | --- |
| `feat/ats-foundation` (checked out) | `fba7834` | **No** (no upstream) | 8 ahead, 0 behind |
| `feat/ats-schema` | `6d4597a` | **No** (no upstream) | 4 ahead, 4 behind |
| `feat/insights-articles` | `39f2d6b` | Yes (`origin/feat/insights-articles`) | 0 ahead, 6 behind; merged |
| `feat/insights-non-it-articles` | `b9c7508` | Was; remote branch deleted (`gone`) | 0 ahead, 1 behind; merged via PR #2 |
| `main` | `a0f3d76` | Tracks `origin/main` | 0 ahead, 4 behind (stale, not fast-forwarded) |

**Exists only on this machine** (lost if it died):

- `feat/ats-foundation`, all 8 commits ahead of `origin/main`:
  - `1ff72a3` feat(db): ATS schema - migrations, RLS, pgTAP tests
  - `191ad2e` chore(db): local-first Supabase workflow, env guard and generated types
  - `8b479d7` fix(env): validate Supabase env at point of use; APP_ENV
  - `72174ab` refactor: route groups, feature folders and import boundaries
  - `d9ad868` feat(db): candidate deletion requests, retention-aware erasure, PII-free audit log
  - `efe6283` feat(storage): the erasure worker
  - `9e952a3` feat(storage): buckets, policies, and the orphan sweep
  - `fba7834` feat(intake): rate limits on the three public forms
- `feat/ats-schema`: an older copy of the first four, before the rebase.
  `git cherry` finds only `4860a05` patch-identical to its rebased
  counterpart; the other three differ by their conflict resolution.
  `feat/ats-foundation` supersedes it.

Also present: a git worktree at `.kilo/worktrees/strong-nitrogen`
(detached at `fc81c2e`, inside an ignored `.kilo/` folder). Origin unknown;
not created in this work.

---

## 2. What is built — frontend

Describes `621a38a`. 31 route patterns in the production build
(`.next/app-path-routes-manifest.json`), counting `robots.txt`,
`sitemap.xml`, `favicon.ico` and the two error routes. The public URLs:

| URL | Status | Note |
| --- | --- | --- |
| `/` | Finished | Hero, services, desks, split section, latest-articles rail, how it works, CTA |
| `/employers` | Finished | |
| `/employers/services` | Finished, with omissions | 5 commercial points are `detail: null` and render nothing (client item 9) |
| `/employers/request-talent` | **Wired** | Inserts a `website_form` lead from the browser. Open or closed by the forms gate (below) |
| `/job-seekers` | Finished | |
| `/job-seekers/upload-resume` | **Not wired, unlisted** | Logs and answers "not open yet". Reachable by URL only (release gate). Build step 7 |
| `/jobs` | Finished | `getJobs()` returns `[]`; the empty state |
| `/jobs/[slug]` | Stub by design | Builds zero pages; every slug 404s. 410 for expired postings not wired |
| `/insights` | Finished | 40 articles; a card opens the modal |
| `/insights/[slug]` | Finished | 40 pages, plus 40 modal variants. BlogPosting and FAQPage JSON-LD |
| `/about`, `/faq`, `/locations`, `/resources`, `/accessibility` | Finished | |
| `/contact` | **Wired** | Inserts into `contact_messages` from the browser. Open or closed by the forms gate. No contact details shown (client item 8) |
| `/privacy-policy` | Finished, with omissions | Says where form submissions are stored when the forms are open; lists the contact form's fields; one cookie, for staff only. `OMITTED` markers remain for client items 1 to 7 |
| `/terms` | Finished, with omissions | Governing law omitted (client item 7) |
| `/login`, `/register`, `/forgot-password` | Stub by design | Candidate accounts: noindex, unlisted, "not open yet", sign nobody in |
| `/staff/sign-in`, `/staff/sign-in/set-up`, `/staff/sign-in/verify` | **Built** | Staff sign-in with TOTP required. Noindex, unlisted, linked from nothing |
| `/staff` | **Built, nearly empty** | Signed-in staff only. Says the inbox comes next (build step 8) |
| any unknown URL | Finished | Custom 404 |

**The forms gate** (`publicFormsOpen()`, decided at build time) opens the
two wired forms with a local stack or on staging, and keeps them closed
with no database, with a hosted URL and no `APP_ENV`, and in production
until `PRODUCTION_RELEASE` holds. **Neither production condition holds
today**: `formStorage.location` is null and `inboxStaffed` is false. So a
production deploy of this commit takes no submissions.

**Every wired form, every path** (CLAUDE.md, "Build status"): stored;
validation error; 429 with the wait in minutes; failure; a first spam-trap
trip refused in the browser and a repeat stored and held; closed.

`(portal)` has a layout and no pages. `app/api/` holds only a README.

---

## 3. What is built — backend

Describes `621a38a`. Migrations in `supabase/migrations/`, each with a
`supabase/rollback/*.down.sql`:

| # | File | Establishes |
| --- | --- | --- |
| 1 | `..._foundation.sql` | Roles, profiles, the `private.*` RLS helpers, append-only audit log, row and soft-delete stamping, the taxonomy |
| 2 | `..._crm_core.sql` | Employers, contacts, leads, requisitions, assignments, jobs (pay range required), contact-form intake |
| 3 | `..._candidates_pipeline.sql` | Resume intake, candidates, documents, embeddings, applications, submissions (consent CHECK gate), events, interviews, offers, placements |
| 4 | `..._activities_comms_content.sql` | Activities, consents, templates, message log, content |
| 5 | `..._row_level_security.sql` | Visibility helpers, privileges, every policy, `public_jobs` and the three employer views |
| 6 | `..._candidate_erasure.sql` | Deletion requests, retention rules, legal holds, the erasure worker, the storage outbox, PII-free audit log |
| 7 | `..._storage_worker.sql` | Outbox leases, outcomes, backoff, health check, the worker's schedule |
| 8 | `..._storage_buckets.sql` | Three private buckets, their policies, server-assigned intake paths, the orphan sweep |
| 9 | `..._intake_rate_limits.sql` | Per-address, per-email and global limits on the three forms; retry de-duplication; HMAC ledger |
| 10 | `..._retention_floor_by_record.sql` | The retention floor per rule, from the kinds of record each covers |
| 11 | `..._intake_review.sql` | `is_test` on the intake tables; whether a resume arrived; inbox indexes |
| 12 | `..._intake_retry_after_in_body.sql` | A 429 repeats its wait in the body, where a cross-origin page can read it |
| 13 | `..._intake_trap_repeat_held.sql` | `trap_tripped`: a repeated spam-trap trip is stored and held, never refused |
| 14 | `..._staff_second_factor_and_sign_in_limit.sql` | A staff role counts only at `aal2`; per-address sign-in attempt limit |

Edge Function: `supabase/functions/storage-erasure-worker/`.

**Schema tests: 380 pgTAP assertions in 9 files**, all passing on this
commit:

| File | Plan | Covers |
| --- | --- | --- |
| `00_schema.test.sql` | 23 | Catalog: RLS everywhere, standard columns, soft delete, FKs and their indexes, grants, column classification, taxonomy |
| `10_access.test.sql` | 95 | Per-role behaviour across every table and view (at `aal2`) |
| `20_erasure.test.sql` | 78 | Deletion requests, end to end |
| `25_retention_floor.test.sql` | 27 | The retention floor per rule |
| `30_storage_worker.test.sql` | 31 | The storage outbox and its worker protocol |
| `40_storage_policies.test.sql` | 48 | Buckets, upload and read matrix, the orphan sweep |
| `50_intake_limits.test.sql` | 35 | 429 and its wait, retries, per-email hold, global ceiling, trap repeats held |
| `60_intake_review.test.sql` | 21 | `is_test`, and the resume-arrival columns |
| `70_staff_sign_in.test.sql` | 22 | Staff at `aal1` hold no role and read nothing; the sign-in limit |

**Other checks on this commit:** `npm test` 523; the browser suite with no
database 55; the `@db` browser suite 18 (Contact and Request Talent: every
path; staff sign-in end to end); `check:seo` passing; `tsc` and `eslint`
clean.

**Written to by the site:** `contact_messages` and `leads`, from the two
wired forms. **Read by the site:** a staff member's own profile row, at
sign-in. Nothing else in `src/` reads or writes the database: the inbox
does not exist yet, so what the forms store is visible only in the
Supabase dashboard.

---

## 4. What is not built

Describes `621a38a`.

| Item | Why |
| --- | --- |
| **The staff inbox** (list, detail, status and test actions, resume download) | Build step 8. Until it exists nobody reads what the forms store, which is why `inboxStaffed` is false |
| **Resume upload endpoints and form** | Build step 7, next. Behind staff sign-in in production, which now exists |
| Production release of the two wired forms | `PRODUCTION_RELEASE`: the storage location (needs the hosted project) and `inboxStaffed` (needs step 8 and a named staff account) |
| ~~Staff promotion snippet~~ | **Built since this snapshot**, in `27d4691`: `supabase/snippets/promote_staff.sql`, safe to run twice. LOCAL.md and STAFF-ACCESS.md point to it |
| Assigning intake rows to staff | Not started. Without it only administrators see form rows (RLS) |
| CAPTCHA | Not started. The honeypot and minimum-time traps run in the browser only |
| Auth for candidate `/login`, `/register`, `/forgot-password` | Blocked on client items 14, 15 |
| Any `(portal)` page; any route handler in `app/api/` | Not started |
| Jobs from the database (`getJobs()` reading `public_jobs`) | Not started |
| 410 for expired postings | Deferred until real postings exist (`wire-expired-postings` skill) |
| Hosted Supabase project, staging, `db push` | Documented in LOCAL.md, not done. The hosted settings now include TOTP on and the sign-in rate limits |
| Storage worker deployment (Vault secrets, function deploy) | Needs a hosted project |
| Netlify environment: `APP_ENV`, the Supabase URL and keys, per context | Not set from this repo, deliberately |
| Staging noindex mechanism | Not started |
| Delivery of storage-erasure alerts to a person | Deploy-time decision (ERASURE.md) |
| Backup-restore runbook that re-runs executed erasures | Not started |
| Audit-log purge job | Blocked on client item 18 |
| OFCCP retention rule | Seeded inactive; client item 19 |
| Payroll, I-9 and wage records | Client item 21 |
| EEO and demographic collection | Deferred |
| Employer-facing views for interviews and offers | Not started |
| CI | None. Nothing runs any test automatically |
| `schema.ts` (zod) and `types.ts` in features | Not started |
| Real publication dates on articles | Client item 17 |
| Deno type-check of the Edge Function | Deno is not installed |
| Two staff people per role, numbers on file, a reset record | Client item 27, for the MFA recovery runbook |

---

## 5. Open decisions awaiting you

All are **[conv]**: raised in session reports, and the questions are not
written down in the repo. Quoted as originally put.

1. Env plumbing, `CLAUDE.md` scope paragraph:
   > "CLAUDE.md said not to add a Supabase client or its env vars. Your request made that call, so I reworded that paragraph to say the client exists but no page, form or route uses it. Check the wording is what you want."
2. Restructure, folder for page sections:
   > "`components/marketing/` is a third folder you didn't list. The home, employers, legal and shared page sections aren't primitives, layout or a feature. The alternative is colocating them under `app/(marketing)/_components/`."
3. Restructure, feature name:
   > "I added a `job-seekers` feature for the upload form and `submitApplication()`. Your list had no place for the third form seam, and `candidates` (empty) is the ATS concept, a different table."
4. Restructure, missing files:
   > "No `schema.ts` or `types.ts` yet. Nothing uses zod, so `schema.ts` would mean a new dependency plus rewritten validation. The existing types stay in `queries.ts`."
5. Restructure, duplicated 404 payload (see 7.6):
   > "The only proper fix is Next's experimental `global-not-found.js`, which changes how the 404 renders, so I left it for you to decide."
6. Restructure, `components/ui` rule:
   > "Some `components/ui` primitives don't meet your three-features rule. `ScrollRail` has one consumer and `Logo` is used only by layout. `FormErrorSummary` is used only by auth. `Field` imports copy from `content/request-talent`. I didn't move them, since you named some explicitly."
7. Restructure, route count:
   > "There are 21 public pages counting `/`, not 20."
8. Branches. Answered conditionally: "Leave the old branches until after task 2 lands anyway, then they can go." Task 2 is `d9ad868`, and later commits followed it. **Nothing deleted yet.**
9. Local `main`:
   > "Local `main`: a fast-forward to `origin/main` whenever you like."
10. `/privacy-policy` wording (see 7.7):
    > "The wording is your call."
11. Soft-delete finding:
    > "If you have the reproduction the finding came from, it belongs in that test file."
12. Erasure alerting:
    > "Getting those signals to a person (log alerts or paging) is a deployment decision and isn't in this repo."

---

## 6. Open questions for the client

From CLIENT-CONFIRM.md. **Blocks** = work cannot proceed or ship without
the answer. **Content** = a page shows less until answered, nothing else
waits.

| # | Question | Kind |
| --- | --- | --- |
| 1 | How long are candidate and requisition data kept, and is deletion scheduled or on request? | **Blocks**: release gate; audit purge |
| 2 | Which third-party processors receive the data, by name or category? | **Blocks**: release gate |
| 3 | Which address handles data-rights requests, who owns it, and what response time? | **Blocks**: release gate; marked most urgent |
| 4 | Is data stored or processed outside the US, and where? | **Blocks**: release gate |
| 5 | Which host serves production, and what do its logs retain? | **Blocks**: release gate |
| 6 | Is personal information sold or shared, and which state privacy laws must the policy satisfy? | **Blocks**: release gate |
| 7 | Which state's law governs the terms, and where are disputes heard? | **Blocks**: terms incomplete |
| 8 | What are the real phone, email, address and hours? | **Blocks**: contact-form delivery; item 3 |
| 9 | What are the fees, rates, retainers and guarantees per engagement model? | Content |
| 10 | Answers to the FAQ questions with no source in the repo | Content |
| 11 | Which address takes accessibility barrier reports? | Content |
| 12 | Will there be an accessibility audit before any conformance claim? | Content (blocks only a conformance claim) |
| 13 | Which markets, if any, justify a real landing page? | Content |
| 14 | Password, session, MFA and lockout policy for accounts | **Blocks**: auth wiring |
| 15 | What is a candidate account for? | **Blocks**: auth and portal scope |
| 16 | Sign-off on all site copy and its operational promises | **Blocks**: launch |
| 17 | Article dates, missing link targets, byline, cited figures, desk for non-IT articles | Content |
| 18 | Confirm workflow statuses; how long the audit log is kept | **Blocks**: ATS UI vocab; audit purge |
| 19 | Does Talentrax hold a federal contract or subcontract? | **Blocks**: OFCCP rule activation |
| 20 | Where does Talentrax operate, and which state retention laws bind it? | **Blocks**: correct retention floors before real data |
| 21 | Is Talentrax the W-2 employer of contract workers? | **Blocks**: payroll and employee-record design |
| 22 | Does the CCPA apply to Talentrax? | Content (deadlines and disclosures; design already meets it) |
| 23 | Counsel review of the erasure design (four specific points) | **Blocks**: real candidate data |
| 24 | Should uploads accept images, and up to what size? | Content (limit tuning) |
| 25 | Do the rate-limit thresholds fit expected volume? | Content (tuning) |

---

## 7. Known defects

### 7.1 Home-page latest-articles rail: actual behaviour

Code: `src/components/ui/ScrollRail.tsx` and
`src/components/marketing/home/LatestArticles.tsx`, both unchanged since
`39f2d6b` (2026-09-26). **CLAUDE.md now describes this code** (`5796955`):
three sets, `data-infinite`, the middle-set span, a hidden scrollbar,
Previous/Next, every repositioning and every stop condition. The earlier
mismatch is resolved.

**The defect that remains: any change of the rail's width parks it on the
first real card, discarding the visitor's place.** It is skipped only if
focus is inside the rail at that moment. The rail is as wide as the page
container, capped at 1280 CSS px, so it fires only below that width. From
the code and its CSS, **not verified in a browser**:

| Action | Resets? |
| --- | --- |
| Phone rotation | Yes |
| Desktop window resize, DevTools docked to the side, snapping to half the screen, below 1280 CSS px | Yes |
| Window resize that stays above 1280 CSS px | No |
| Browser page zoom | Yes, once the zoomed viewport is below 1280 CSS px; no above |
| Pinch zoom on a phone | No |
| Page scrollbar appearing or disappearing (classic scrollbars, below 1280 CSS px; e.g. the mobile drawer opening in a narrow desktop window) | Yes; no `scrollbar-gutter` is set |
| Mobile address bar collapsing, on-screen keyboard | No (height only) |

Also unverified: whether any recentre is visually seamless, and `scrollend`
support in every target browser.

### 7.2 The three forms: no longer claim success (`4b7baee`)

- The seams return `{ ok: false, reason: "unavailable" }`. Each form shows
  "This form is not open yet. Nothing was sent." (`role="status"`,
  focused), and keeps what was typed. The spam path shows the same.
- Each page carries a `NotOpenNotice` above the form. It is the same
  component the account screens now use.
- **Remaining:** the seams still `console.log` the payload in the visitor's
  own browser.

### 7.3 The resume form is unlinked; job seekers have no route

`/job-seekers/upload-resume` is linked from no generated page. Checked
across every built HTML file and its RSC payload: none links to it. It is
out of the sitemap, noindex, and in check:seo's `UNLISTED_ROUTES`. Still in
the code:

- `applyHref` on `/jobs/[slug]` points at it. That route builds zero pages
  while there are no jobs, so nothing renders it.
- **Copy that still invites a resume, with no link.** Blocked: the site
  publishes no contact channel to point it at (client items 3 and 8).
  - the `/job-seekers` opening section, and its closing block ("Send us
    your resume", now offering only "Browse open roles");
  - the closing blocks on `/jobs`, `/locations` and `/resources`;
  - the FAQ answer "How do I apply?".
- The candidate cards on `/contact`, `/insights` and the empty job board are
  removed, waiting on the same channel.

### 7.4 CLAUDE.md "Build status" is stale

- It says "Every other route renders the shared `ComingSoon` component".
  The Routes section of the same file says nothing is coming soon, and the
  code agrees.
- Its built-route list omits `/faq`, `/locations`, `/resources`,
  `/accessibility`, `/insights` and the account screens.

### 7.5 Root README.md is create-next-app boilerplate

It refers to `app/page.tsx`, which does not exist.

### 7.6 The 404 element is duplicated in every page's RSC payload [conv]

- Measured during the restructure, which introduced the `(marketing)` route
  group: the not-found boundary is serialized twice.
- Cost: median +312 bytes gzip per page.
- Not recorded in the repo; not re-measured for this file.

### 7.7 /privacy-policy promises unconditional deletion [conv]

- The page says "You can ask us to delete it, and we will, without asking
  you to justify it." and "withdrawing the required one means we delete
  what we hold."
- `supabase/ERASURE.md` defers deletion under retention law.
- The conflict is not recorded in the repo.

### 7.8 Other

- Local `main` is 4 commits behind `origin/main`.
- `ERASURE.md`'s statement about New York's pay-transparency record-keeping
  rests on a secondary source: unverified against the statute.
- The storage design assumes `storage.objects` reflects the bytes in the
  storage backend: unverified.

### 7.9 An in-route 404 has an empty server body (known, not being fixed)

Added 2026-10-02, after `ff56050`; measured on that build with `next start`.

A `notFound()` thrown inside a public route - an unknown job or article -
answers with an HTML body that has nothing in it. The header, `<main>`, the
`<h1>` and the 404 copy all arrive in the RSC payload and are drawn only
once the browser runs it. An unmatched URL renders in full on the server.

| URL | Status | robots noindex | Server HTML: header, `<main>`, `<h1>` | Server HTML: visible text |
| --- | --- | --- | --- | --- |
| `/jobs/no-such-job` | 404 | yes | 0, 0, 0 | none |
| `/insights/no-such-article` | 404 | yes | 0, 0, 0 | none |
| `/no-such-page` | 404 | yes | 1, 1, 1 | the full 404 page |

- **The status code is correct**, and so is the noindex tag. A crawler is
  told the URL does not exist, which is the only thing a 404 has to say.
- After hydration the page is complete: the browser suite counts one
  header, one `<main>`, one footer and one `<h1>` on both kinds of 404
  (`tests/browser/site.spec.ts`).
- What is lost: a visitor with JavaScript off, or a client that reads only
  the server HTML, sees a blank page instead of the 404 copy and the way
  back to the site.
- **Deliberately not being fixed.** The status code, which is what a 404
  has to get right, is right.
- Found while building the layout split (`ff56050`) and reported then as
  existing behaviour rather than something the split introduced **[conv]**.
  Not re-checked on a build from before the split.

---

## 8. Verification status

Run on this commit, 2026-10-02:

| Check | Result |
| --- | --- |
| `npm test` (Node test runner, 7 files incl. `drain.test.ts`) | 511 pass, 0 fail |
| `npm run db:reset` then `npm run db:test` (pgTAP, 6 files) | 304 pass |
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 problems |
| `next build` | Succeeds; 27 route patterns; 40 article pages |
| `npm run check:seo` against `next start` | 109 ok, 0 fail |
| `npm audit` | 0 vulnerabilities |

**Exercised against real local services [conv]:** done in the session; no
script in the repo reproduces them.

- **Storage API:** responses for missing objects and buckets, and an anon
  delete.
- **Edge Function** in the local Edge runtime:
  - 401 for the anon key;
  - two concurrent workers took disjoint rows;
  - outcomes `deleted` and `already_absent`.
- **Storage policies** through the Storage API with seeded logins:
  uploads, overwrite refusal, wrong file type, downloads by role.
- **A full erasure:** request, accept, database erasure, then the worker
  deleted both files.
- **Rate limits** through PostgREST: twenty 201s, then 429 with
  `Retry-After`; a retry at the limit got 201 without a duplicate row.

**Never tested in a browser.** No browser or end-to-end tooling exists in
the repo (no Playwright, Cypress or Testing Library), and no browser
session is recorded anywhere. That includes:

- Keyboard navigation; skip link; focus order; focus ring visibility.
- The 320px layout and horizontal scroll.
- File-size and file-type rejection on the resume form.
- Focus traps: mobile drawer, article modal.
- Error summaries taking focus; `aria-invalid` and `aria-describedby`
  announcements.
- Screen readers, speech input, zoom and reflow (as `/accessibility`
  states).
- The latest-articles rail: drift, pause, recentre, reduced motion,
  touch, `scrollend`.
- The article modal: open, close, back, scroll lock and restore.
- The mobile drawer's scroll lock; smooth anchor scrolling.
- Safari, Firefox, and mobile browsers generally.
