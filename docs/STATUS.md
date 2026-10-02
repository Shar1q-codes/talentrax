# Project status

Snapshot of `feat/ats-foundation` at `fba7834`, taken 2026-10-02.

Derived from the repository: git, the file tree, the tests, CLAUDE.md,
CLIENT-CONFIRM.md and `supabase/*.md`. Checks in section 8 were re-run on
this commit when this file was written.

**[conv]** marks a fact that is known only from the working session that
produced this file and is **not recorded anywhere else in the repo**.

**Partly regenerated after `5796955`** (forms fixed and resume form
unlinked in `4b7baee`; CLAUDE.md's rail section corrected in `5796955`).
Only these entries were regenerated: the form and resume-link rows in
sections 2 and 4, and sections 7.1 to 7.3. **Everything else - section 1
included, which predates the push of `feat/ats-foundation` - still describes
`fba7834`.**

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

27 route patterns in the production build (`.next/app-path-routes-manifest.json`).
The public URLs:

| URL | Status | Note |
| --- | --- | --- |
| `/` | Finished | Hero, services, desks, split section, latest-articles rail (see 7.1), how it works, CTA |
| `/employers` | Finished | |
| `/employers/services` | Finished, with omissions | 5 commercial points are `detail: null` and render nothing (client item 9) |
| `/employers/request-talent` | **Partial** | Form UI complete. Not open yet: a notice above the form, and a submit answers "This form is not open yet. Nothing was sent." (see 7.2) |
| `/job-seekers` | Finished | |
| `/job-seekers/upload-resume` | **Partial, unlisted** | As above. Reachable by URL only: linked from no page, noindex, not in the sitemap (release gate; see 7.3) |
| `/jobs` | Finished | `getJobs()` returns `[]`; the empty state routes employers to the requisition form and offers job seekers no route (see 7.3) |
| `/jobs/[slug]` | Stub by design | Builds zero pages; every slug 404s. 410 for expired postings not wired |
| `/insights` | Finished | Index of 40 articles; a card click opens the modal (intercepting route) |
| `/insights/[slug]` | Finished | 40 pages, plus 40 modal variants under `(.)[slug]`. BlogPosting and FAQPage JSON-LD |
| `/about` | Finished | |
| `/contact` | **Partial** | As above, not open yet. No contact details: all `isPlaceholder` (client item 8). The "You are looking for work" card is removed |
| `/faq` | Finished | |
| `/locations` | Finished | No market list, by design |
| `/resources` | Finished | |
| `/accessibility` | Finished | States the site is not audited or AT-tested |
| `/privacy-policy` | Finished, with omissions | 9 `OMITTED` markers (sentences and sections) pending client items 1–7 |
| `/terms` | Finished, with omissions | Governing law omitted (client item 7) |
| `/login`, `/register`, `/forgot-password` | Stub by design | noindex, not in sitemap; "not open yet" notice; seams return `unavailable` |
| any unknown URL | Finished | Custom 404 |

Also: `/robots.txt`, `/sitemap.xml`, `/favicon.ico`.

Not yet routes: `(portal)` and `(internal)` contain a layout each and no
pages; `app/api/` contains only a README.

**Articles: 40** (40 files, 40 in `index.ts`, 40 in `article-order.ts`).

---

## 3. What is built — backend

Migrations in `supabase/migrations/`, each with a matching
`supabase/rollback/*.down.sql`:

| # | File | Establishes |
| --- | --- | --- |
| 1 | `20261001000100_foundation.sql` | Roles, profiles, the `private.*` RLS helpers, append-only audit log, row stamping, soft-delete stamping, the taxonomy |
| 2 | `20261001000200_crm_core.sql` | Employers, contacts, leads, requisitions, assignments, jobs (pay range required), contact-form intake |
| 3 | `20261001000300_candidates_pipeline.sql` | Resume intake, candidates, documents (original vs scrubbed), embeddings, applications, submissions (consent CHECK gate), events, interviews, offers, placements |
| 4 | `20261001000400_activities_comms_content.sql` | Activities, communication consents, email templates, message log (consent enforced), content |
| 5 | `20261001000500_row_level_security.sql` | Visibility helpers, privileges, every policy, `public_jobs` and the three employer views |
| 6 | `20261001000600_candidate_erasure.sql` | Deletion requests, retention rules, legal holds, erasure worker, storage outbox, PII-free audit log, pg_cron schedule |
| 7 | `20261001000700_storage_worker.sql` | Outbox leases, tokens, outcomes, backoff, health check; pg_net invocation of the worker |
| 8 | `20261001000800_storage_buckets.sql` | Three private buckets, `storage.objects` policies, server-assigned intake paths, orphan sweep |
| 9 | `20261001000900_intake_rate_limits.sql` | Per-IP, per-email and global limits on the three public forms; retry de-duplication; HMAC ledger |

Edge Function: `supabase/functions/storage-erasure-worker/`
(`index.ts`, `drain.ts`, `drain.test.ts`).

**Schema tests: 304 pgTAP assertions in 6 files** (`supabase/tests/database/`):

| File | Plan | Covers |
| --- | --- | --- |
| `00_schema.test.sql` | 22 | Catalog: RLS everywhere, standard columns, soft delete, RESTRICT FKs and their indexes, grants, column classification, taxonomy |
| `10_access.test.sql` | 95 | Per-role behaviour across every table and view |
| `20_erasure.test.sql` | 78 | Deletion requests: permissions, deferral, execution across every table, cancel, legal hold, failure rollback, audit log PII-free |
| `30_storage_worker.test.sql` | 31 | Queue: leases, the three outcomes, stale tokens, backoff, attention flag, missing bucket |
| `40_storage_policies.test.sql` | 48 | Bucket config; read and upload matrix by role; path guessing; no overwrite or delete; restriction; orphan sweep |
| `50_intake_limits.test.sql` | 30 | 429 and `Retry-After`; retries; IPv6 /64; per-email hold; global ceiling; ledger |

**In the database with no UI at all** (nothing in `src/` constructs the
Supabase client or reads `public_jobs`):

- The whole ATS: employers, contacts, leads, requisitions, jobs,
  candidates, documents, applications, submissions and their timeline,
  interviews, offers, placements, activities, consents, message log,
  templates, content.
- The employer views: `employer_requisitions`, `employer_submissions`,
  `employer_submission_documents`.
- Deletion requests: `request_my_deletion()`, `record_`, `accept_`,
  `refuse_`, `cancel_deletion_request()`, legal holds, `retention_rules`.
- The storage buckets and their upload paths.
- `intake_limits`, and the held-for-review mark (`held_at`) on intake rows.
- `storage_erasure_backlog()`.

---

## 4. What is not built

| Item | Why |
| --- | --- |
| Storage worker deployment: Vault secrets `storage_worker_url`, `storage_worker_key`, and deploying the function | Not started. Needs a hosted project, and there is none |
| Signed-upload endpoint for the resume form (mints a URL, sets `resume_storage_path`) | Not started |
| CAPTCHA or honeypot on the public forms | Not started (supabase/README.md) |
| Database wiring of the three forms (`submitRequisition`, `submitApplication`, `submitContact`) | Not started. Each logs and returns `unavailable`; the form says it is not open yet |
| `submission_key` sent by the forms | Not started. Retries are de-duplicated on content only until it is |
| Auth backend for `/login`, `/register`, `/forgot-password` | Blocked on client items 14, 15 |
| Any `(portal)` or `(internal)` page | Not started. Root-layout split deferred to the first such page (CLAUDE.md) |
| Any route handler in `app/api/` | Not started |
| Jobs from the database (`getJobs()` reading `public_jobs`) | Not started |
| 410 for expired postings, and its check:seo assertions | Deferred until real postings exist (`wire-expired-postings` skill) |
| Hosted Supabase project, staging project, `supabase link` / `db push` | Deferred: documented, not executed (supabase/LOCAL.md) |
| Staging noindex mechanism | Not started ("not built yet", supabase/LOCAL.md) |
| Hosted Auth settings: email confirmation, SMTP, site URL, redirect URLs | Deferred to hosted setup. Local `enable_confirmations = false` |
| Netlify environment: `APP_ENV`, the Supabase URL and key, per context | Not set from this repo. Deliberately not in `netlify.toml` |
| Delivery of storage-erasure alerts to a person | Deploy-time decision (supabase/ERASURE.md) |
| Backup-restore runbook that re-runs executed erasures | Not started (supabase/ERASURE.md, "Backups") |
| Audit-log purge job | Blocked on client item 18 |
| OFCCP retention rule | Seeded inactive; blocked on client item 19 |
| Payroll, I-9 and wage records if Talentrax employs contractors | Blocked on client item 21 |
| EEO and demographic collection | Deferred ("separate and later", `src/content/upload-resume.ts`) |
| Employer-facing views for interviews and offers | Not started (supabase/README.md) |
| CI | None exists: no `.github/`. Nothing runs tests automatically |
| `schema.ts` (zod) and `types.ts` in features | Not started; nothing uses zod |
| Real publication dates on articles | Blocked on client item 17 |
| Deno type-check of `index.ts` | Never run: Deno is not installed; the file is excluded from `tsc` |

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
