# Project status

**This whole file describes `f0e9b1a`** (build step 8, the staff inbox), on
`feat/ats-foundation`, regenerated in full on 2026-10-02. The commit that
adds this file changes nothing else. Anything later than `f0e9b1a` is not
reflected here.

Derived from the repository: git, the file tree, the tests, CLAUDE.md,
CLIENT-CONFIRM.md and `supabase/*.md`. Every check in section 8 was run on
`f0e9b1a`.

**[conv]** marks a fact known only from a working session and **not recorded
anywhere else in the repo**.

---

## 1. Branch state

`origin` = `github.com/Shar1q-codes/talentrax`, fetched 2026-10-02.
`origin/main` = `fc81c2e` (Merge PR #2).

| Branch | HEAD | Pushed | vs `origin/main` |
| --- | --- | --- | --- |
| `feat/ats-foundation` (checked out) | `f0e9b1a` | Yes, to `9b88d7b`; the gate fix (`c700a45`), the inbox (`f0e9b1a`) and this file go with the next push | 34 ahead, 0 behind |
| `feat/ats-schema` | `6d4597a` | No (no upstream) | Superseded by `feat/ats-foundation` (an older copy of its first four commits) |
| `feat/insights-articles` | `39f2d6b` | Yes | Merged |
| `feat/insights-non-it-articles` | `b9c7508` | Remote branch deleted (`gone`) | Merged via PR #2 |
| `main` | `a0f3d76` | Tracks `origin/main` | 4 behind: never fast-forwarded |

No pull request is open for `feat/ats-foundation`.

Also present: a git worktree at `.kilo/worktrees/strong-nitrogen`
(detached at `fc81c2e`, inside an ignored `.kilo/` folder). Not created by
this work; origin unknown.

**History rewritten once, before it was pushed:** GitHub's push protection
refused `962c70b` because `.env.local.example` carried the local stack's
demo secret key, which has the shape of a real Supabase secret. That commit
and the one after it were rebuilt with the value left empty (`4c94b71`,
`9b88d7b`); nothing else changed. The developer copies the key from
`npx supabase status -o env` (`supabase/LOCAL.md`).

---

## 2. What is built — frontend

35 route patterns in the production build
(`.next/app-path-routes-manifest.json`), counting `robots.txt`,
`sitemap.xml`, `favicon.ico`, the two error routes and the inbox's download
route.

### Public routes

| URL | Status | Note |
| --- | --- | --- |
| `/` | Finished | Hero, services, desks, split section, latest-articles rail, how it works, CTA |
| `/employers` | Finished | |
| `/employers/services` | Finished, with omissions | 5 commercial points are `detail: null` and render nothing (client item 9) |
| `/employers/request-talent` | **Wired** | Inserts a `website_form` lead from the visitor's browser. Open or closed by the forms gate |
| `/job-seekers` | Finished | |
| `/job-seekers/upload-resume` | **Wired, gated** | Row, signed upload, byte check. **A 404 in production** until `RESUME_PUBLIC_RELEASE` clears (client items 1 to 8 and the lawyer review); elsewhere unlisted and noindex |
| `/jobs` | Finished | `getJobs()` returns `[]`; the empty state |
| `/jobs/[slug]` | Stub by design | Builds zero pages; every slug 404s. 410 for expired postings not wired |
| `/insights` | Finished | 40 articles; a card opens the modal |
| `/insights/[slug]` | Finished | 40 pages, plus 40 modal variants; BlogPosting and FAQPage JSON-LD |
| `/about`, `/faq`, `/locations`, `/resources`, `/accessibility` | Finished | |
| `/contact` | **Wired** | Inserts into `contact_messages` from the visitor's browser. Open or closed by the forms gate. No contact details shown (client item 8) |
| `/privacy-policy` | Finished, with omissions | Names Supabase as where form submissions and files are stored, when the forms are open; one cookie, for staff only. `OMITTED` markers remain for client items 1 to 7 |
| `/terms` | Finished, with omissions | Governing law omitted (client item 7) |
| `/login`, `/register`, `/forgot-password` | Stub by design | Candidate accounts: noindex, unlisted, "not open yet", sign nobody in |
| any unknown URL | Finished | Custom 404 |

### Staff routes (`(internal)`)

All noindex, out of the sitemap, linked from no public page (`check:seo`
asserts it). Every page and action checks the session itself.

| URL | What |
| --- | --- |
| `/staff/sign-in`, `/set-up`, `/verify` | Email and password; then authenticator setup (first time) or its code |
| `/staff` | Signed in: links to the inbox and the staff resume form; sign out |
| `/staff/inbox` | Every submission the caller may see, newest first; filter by form; test rows on request; each resume's file state |
| `/staff/inbox/<kind>/<id>` | One submission: every field, the file's state, status and test flag |
| `/staff/inbox/file/<id>` | Route: a one-minute signed download link for a received resume, or 404 |
| `/staff/upload-resume` | The resume form behind sign-in: how staff try it in production before it is public |

`(portal)` has a layout and no pages. `app/api/` holds only a README: the
upload endpoints are server actions (CLAUDE.md, "Build status").

### The forms gate, and what production takes today

| Build | Contact, Request Talent | Resume (public) | Resume (staff) |
| --- | --- | --- | --- |
| No Supabase URL or key | closed | closed | closed |
| Local stack, `APP_ENV` unset | open | open | open |
| Hosted URL, `APP_ENV` unset | closed | closed | closed |
| `APP_ENV=staging` | open | open | open |
| `APP_ENV=production` | **closed**: `PRODUCTION_RELEASE` false | **404**: `RESUME_PUBLIC_RELEASE` false | open |

**A production deploy of `f0e9b1a` takes no public submission at all.**
`PRODUCTION_RELEASE` waits on `formStorage.location` (the hosted project's
region, in the privacy policy) and `inboxStaffed` (a named staff account on
the production project). `RESUME_PUBLIC_RELEASE` waits on client items 1 to
8 and the lawyer review. Every condition is set by hand, in the commit that
makes it true.

### What a visitor sees on a wired form

Stored: the confirmation. Validation error: the error summary. 429: "too
many ... recently", with the wait in minutes. Network or server failure:
"could not be sent", what was entered kept, and a resend resumes the same
submission. First spam-trap trip: refused, nothing sent; a repeat: stored
and held. Resume only, a file that is not what its name says: "your details
reached us, but your file did not", the file not kept. Closed: the notice,
and "nothing was sent".

**Articles: 40** (40 files, 40 in `index.ts`, 40 in `article-order.ts`).

---

## 3. What is built — backend

Migrations in `supabase/migrations/`, each with a
`supabase/rollback/*.down.sql`:

| # | File | Establishes |
| --- | --- | --- |
| 1 | `..._foundation.sql` | Roles, profiles, the `private.*` RLS helpers, append-only audit log, row and soft-delete stamping, the taxonomy |
| 2 | `..._crm_core.sql` | Employers, contacts, leads, requisitions, assignments, jobs (pay range required), contact intake |
| 3 | `..._candidates_pipeline.sql` | Resume intake, candidates, documents, embeddings, applications, submissions (consent CHECK gate), interviews, offers, placements |
| 4 | `..._activities_comms_content.sql` | Activities, consents, templates, message log, content |
| 5 | `..._row_level_security.sql` | Visibility helpers, privileges, every policy, `public_jobs` and the three employer views |
| 6 | `..._candidate_erasure.sql` | Deletion requests, retention rules, legal holds, the erasure worker, the storage outbox |
| 7 | `..._storage_worker.sql` | Outbox leases, outcomes, backoff, health check |
| 8 | `..._storage_buckets.sql` | Three private buckets, their policies, server-assigned intake paths, the orphan sweep |
| 9 | `..._intake_rate_limits.sql` | Per-address, per-email and global limits on the three forms; retry de-duplication |
| 10 | `..._retention_floor_by_record.sql` | The retention floor per rule, from the records it covers |
| 11 | `..._intake_review.sql` | `is_test`; whether a resume arrived; inbox indexes |
| 12 | `..._intake_retry_after_in_body.sql` | A 429 repeats its wait in the body, readable cross-origin |
| 13 | `..._intake_trap_repeat_held.sql` | A repeated spam-trap trip is stored and held, never refused |
| 14 | `..._staff_second_factor_and_sign_in_limit.sql` | A staff role counts only at `aal2`, on every table |
| 15 | `..._reset_sign_in_attempts.sql` | Clearing an address's sign-in count: service role and the SQL editor only |
| 16 | `..._sign_in_delay_not_lockout.sql` | Sign-in failures earn a growing delay (ceiling 10 s), one attempt per address at a time, no lockout |
| 17 | `..._resume_upload_endpoints.sql` | A slot for a fresh intake row; the verdict on what arrived; a rejected file queued for deletion |
| 18 | `..._intake_read_only_received.sql` | An intake file is readable only once received; a file of any age can be checked |

Edge Function: `supabase/functions/storage-erasure-worker/`. Operator
snippet: `supabase/snippets/promote_staff.sql` (promote an account to a
staff role; safe to run twice).

**Schema tests: 420 pgTAP assertions in 10 files**, all passing:

| File | Plan | Covers |
| --- | --- | --- |
| `00_schema.test.sql` | 23 | Catalog: RLS everywhere, standard columns, soft delete, FKs and indexes, grants, column classification, taxonomy |
| `10_access.test.sql` | 95 | Per-role behaviour across every table and view (at `aal2`) |
| `20_erasure.test.sql` | 78 | Deletion requests, end to end |
| `25_retention_floor.test.sql` | 27 | The retention floor per rule |
| `30_storage_worker.test.sql` | 31 | The storage outbox and its worker protocol |
| `40_storage_policies.test.sql` | 51 | Buckets; read and upload matrix; refused and unchecked intake files unreadable |
| `50_intake_limits.test.sql` | 35 | 429 and its wait, retries, per-email hold, global ceiling, trap repeats held |
| `60_intake_review.test.sql` | 21 | `is_test`; the resume-arrival columns |
| `70_staff_sign_in.test.sql` | 33 | Staff at `aal1` hold no role; the sign-in delay, lease and reset |
| `80_resume_upload.test.sql` | 26 | Upload slots, the verdict, the later check, who may call them |

**What the site reads and writes.** The three forms insert from the
visitor's browser (publishable key; the rate limit sees the visitor). The
resume endpoints and the inbox's late check use the secret key, through
service-role-only database functions. Staff sign-in uses the staff
member's session, with the secret key on four Auth calls only
(`auth-fetch.ts`), ready for forwarded visitor addresses. The inbox reads
and updates the three intake tables through the staff member's session, so
RLS decides.

**API keys:** the new format, publishable and secret. The legacy `anon` and
`service_role` keys are unused by the app and still enabled on every
project until someone disables them (LOCAL.md).

---

## 4. What is not built

| Item | Why |
| --- | --- |
| Routing intake rows to staff | Not started. Without it only administrators (and research analysts, for talent requests) see anything in the inbox |
| Converting a resume into a candidate, or a lead into an employer; notes; replies; search; bulk actions | Not started: the pipeline, deliberately outside step 8 |
| Production release of the forms | `PRODUCTION_RELEASE` (storage location; a named production staff account) and `RESUME_PUBLIC_RELEASE` (client items 1 to 8; the lawyer review) |
| Hosted Supabase project, staging, `db push` | Documented in LOCAL.md, not done |
| Auth IP forwarding (`Sb-Forwarded-For`) | Code ready; needs a hosted project with forwarding switched on, then the three checks in LOCAL.md |
| Disabling the legacy API keys | After the hosted site runs on the new ones, and after moving the storage-erasure worker off the injected legacy key |
| Storage worker deployment (Vault secrets, function deploy) | Needs a hosted project. Until it runs, rejected uploads stay in the bucket, unreadable (migration 18) |
| Malware scanning of uploads | Client item 26 |
| CAPTCHA | Not started. The honeypot and minimum-time traps run in the browser only |
| Auth for candidate `/login`, `/register`, `/forgot-password` | Blocked on client items 14, 15 |
| Any `(portal)` page | Not started |
| Jobs from the database (`getJobs()` reading `public_jobs`) | Not started |
| 410 for expired postings | Deferred until real postings exist (`wire-expired-postings` skill) |
| Netlify environment: `APP_ENV`, the Supabase URL and keys, per context | Not set from this repo, deliberately |
| Staging noindex mechanism | Not started |
| Delivery of storage-erasure alerts to a person | Deploy-time decision (ERASURE.md) |
| Backup-restore runbook that re-runs executed erasures | Not started |
| Audit-log purge job | Blocked on client item 18 |
| OFCCP retention rule | Seeded inactive; client item 19 |
| Payroll, I-9 and wage records | Client item 21 |
| EEO and demographic collection | Deferred, separate and later |
| Employer-facing views for interviews and offers | Not started |
| CI | None. Nothing runs any test automatically |
| `schema.ts` (zod) and `types.ts` in features | Not started; nothing uses zod |
| Real publication dates on articles | Client item 17 |
| Deno type-check of the Edge Function | Deno is not installed |

---

## 5. Open decisions awaiting you

Raised in working sessions and not answered in the repo. **[conv]** unless a
file is named.

1. **Old branches.** You said they could go once erasure (`d9ad868`) landed.
   It has; `feat/ats-schema` and the local copies of the merged insights
   branches are still here. Nothing deleted yet.
2. **Local `main`**: four behind `origin/main`; a fast-forward whenever you
   like.
3. **`/privacy-policy` promises unconditional deletion** (7.6): the wording
   is yours to change, ideally with the lawyer review.
4. **Moving the per-address sign-in control inside Supabase Auth**, with the
   password- and MFA-verification attempt hooks. Teams and Enterprise plans
   only (`supabase/STAFF-ACCESS.md`, "Two paths to the password").
5. **The duplicated 404 boundary in every page's RSC payload** (7.5): the
   only full fix is Next's experimental `global-not-found.js`.
6. **`components/ui` primitives that fail the three-features rule**
   (`ScrollRail`, `Logo`, `FormErrorSummary`, `Field`'s copy import): left
   where they are.
7. **`components/marketing/`** as a third component folder, rather than
   `app/(marketing)/_components/`.
8. **Erasure alerting**: getting the worker's failure signals to a person is
   a deployment decision.
9. **The soft-delete finding**: if you have the reproduction it came from,
   it belongs in the tests.
10. **Routing in the inbox**: who assigns intake rows, and to whom, is the
    first follow-up to step 8 (CLAUDE.md, "The staff inbox").

---

## 6. Open questions for the client

From CLIENT-CONFIRM.md. **Blocks** = work cannot proceed or ship without
the answer. **Content** = a page shows less until answered.

| # | Question | Kind |
| --- | --- | --- |
| 1 | Retention: how long candidate and requisition data are kept | **Blocks**: resume release gate; audit purge |
| 2 | Processors, by name or category | **Blocks**: resume release gate |
| 3 | The data-rights contact address, its owner, response time | **Blocks**: resume release gate; most urgent |
| 4 | International transfers | **Blocks**: resume release gate |
| 5 | Production host, and what its logs retain | **Blocks**: resume release gate |
| 6 | Sale and sharing; which state privacy laws apply | **Blocks**: resume release gate |
| 7 | Governing law and venue | **Blocks**: resume release gate; terms incomplete |
| 8 | Real phone, email, address and hours | **Blocks**: resume release gate; `/contact` details |
| 9 | Fees, rates, retainers, guarantees per engagement model | Content |
| 10 | FAQ questions with no source in the repo | Content |
| 11 | Where accessibility barrier reports go | Content |
| 12 | An accessibility audit before any conformance claim | Content |
| 13 | Which markets justify a landing page | Content |
| 14 | Password, session, MFA and lockout policy for accounts | **Blocks**: candidate auth |
| 15 | What a candidate account is for | **Blocks**: candidate auth and portal |
| 16 | Sign-off on all site copy and its promises | **Blocks**: launch |
| 17 | Article dates, link targets, bylines, figures, desks | Content |
| 18 | Workflow statuses; audit-log retention | **Blocks**: ATS vocabulary; audit purge |
| 19 | Federal contracts (OFCCP) | **Blocks**: OFCCP rule activation |
| 20 | Where Talentrax operates; which state retention laws bind it | **Blocks**: correct retention floors before real data |
| 21 | Employer of record on Contract engagements | **Blocks**: payroll and employee records |
| 22 | Whether the CCPA applies | Content |
| 23 | Counsel review of the erasure design | **Blocks**: real candidate data |
| 24 | Which file types candidates may upload | Content |
| 25 | Whether the rate-limit thresholds fit expected volume | Content |
| 26 | Malware scanning of uploaded files: whether, who runs it, who pays | Neither yet: the residual risk is described in the item |
| 27 | Staff MFA (built): two people per role before go-live, where staff numbers on file live, where each reset is recorded | **Blocks**: production go-live |

Also needed from the client for `PRODUCTION_RELEASE`: a hosted Supabase
project (account, billing, region, the data processing agreement) and the
first named staff account.

---

## 7. Known defects and limits

### 7.1 An in-route 404 has an empty server body (known, not being fixed)

Re-measured on `f0e9b1a` with `next start`:

| URL | Status | Server HTML: `<main>`, `<h1>` | Server HTML: text |
| --- | --- | --- | --- |
| `/jobs/no-such-job` | 404 | 0, 0 | none |
| `/insights/no-such-article` | 404 | 0, 0 | none |
| `/no-such-page` | 404 | 1, 1 | the full 404 page |
| `/staff/no-such-page` | 404 | 1, 1 | the full public 404 page |

The status code and the noindex tag are correct. After hydration both
kinds are complete (the browser suite counts one of each). A client without
JavaScript sees a blank page on an in-route 404. Deliberately not being
fixed. An unmatched `/staff/...` URL gets the public site's 404, with its
navigation: nothing is disclosed, but it is not the staff chrome.

### 7.2 Copy that invites a resume, with nowhere public to send it

The public resume route is a 404 in production until its release gate
clears, and unlinked everywhere else. Still in the copy: the `/job-seekers`
opening and closing blocks, the closing blocks on `/jobs`, `/locations` and
`/resources`, `/about`'s intro, the sign-in page's line "You do not need one
to send us your resume", and the FAQ answer "How do I apply?". `applyHref`
on `/jobs/[slug]` points at the form; that route builds no pages while there
are no jobs. All of it waits on the same release decision.

### 7.3 CLAUDE.md "Build status" opening is stale

It still says "Every other route renders the shared `ComingSoon`
component"; the Routes section of the same file, and the code, say nothing
is coming soon.

### 7.4 Root README.md is create-next-app boilerplate

It refers to `app/page.tsx`, which does not exist. Operational docs are
under `supabase/` and `docs/`.

### 7.5 The 404 element is duplicated in every page's RSC payload [conv]

Measured during the route-group restructure: the not-found boundary is
serialized twice, median +312 bytes gzip per page. Not re-measured.

### 7.6 /privacy-policy promises unconditional deletion [conv]

"You can ask us to delete it, and we will, without asking you to justify
it" and "withdrawing the required one means we delete what we hold", while
`supabase/ERASURE.md` defers deletion under retention law. Still on the
page at `f0e9b1a`.

### 7.7 What a local run cannot prove

- **Hosted Auth requiring the secret key.** Local Auth accepts any key, or
  none. A temporary log showed the four sign-in calls carry the secret key;
  that hosted Auth enforces it rests on Supabase's documentation.
- **IP forwarding.** The local stack has no setting for it.
- **Production's gate behaviour.** A production build refuses a local stack,
  so the 404 and the closed forms are pinned by unit tests of
  `decideFormsOpen` and `decideResumeAccess`, not by a browser.
- **The storage worker deleting a rejected upload.** Locally no worker is
  scheduled; the tests check the deletion is queued and the file unreadable.

### 7.8 The direct route to the password

The publishable key is public, so a staff password can be tried straight
against Supabase Auth's API, where only Auth's per-IP limits apply (30
sign-ins per 5 minutes, 15 code checks per minute, defaults). A password
found that way opens the person's own profile row and nothing else; the
authenticator code is the control (`supabase/STAFF-ACCESS.md`). Through our
page, until forwarding is on, Auth counts our server's address for every
staff member, so a flood there can block staff sign-in for up to five
minutes.

### 7.9 Other

- Local `main` is 4 commits behind `origin/main`.
- `ERASURE.md`'s statement about New York's pay-transparency record-keeping
  rests on a secondary source: unverified against the statute.
- The storage design assumes `storage.objects` reflects the bytes in the
  storage backend: unverified.
- The local database keeps what the `@db` suite submits (rows on
  `example.com`, so `is_test`; their files; one queued deletion per run).
  `npm run db:reset` clears it. Each pgTAP file that counts shared state
  clears it inside its own rolled-back transaction.

---

## 8. Verification status

Run on `f0e9b1a`, 2026-10-02:

| Check | Result |
| --- | --- |
| `npm test` (Node test runner) | 544 pass, 0 fail |
| `npm run db:test` (pgTAP, 10 files) | 420 pass |
| Rollback round-trip of every migration added this session (12 to 18) | Each undone and reapplied cleanly |
| `tsc --noEmit` | 0 errors |
| `eslint` (src, scripts) | 0 problems |
| `npm run build` (with `check-bundle`) | Succeeds; 35 route patterns; no secret key in the output, its name in no browser code |
| `npm run check:seo` against `next start` | All assertions pass |
| `npm run test:browser` (no database; headed included) | 56 pass |
| `npm run test:browser:db` (local stack), twice in a row | 29 pass, then 29 pass |
| `npm audit` | 0 vulnerabilities |

**What the browser suites cover:** the forms' closed state with no
database; every path of all three wired forms against the database (stored,
validation, a real 429, a retry after a lost response, the spam-trap
repeat, the resume's refused file); staff sign-in end to end (authenticator
setup, the cookie's attributes, sign out and back, a password-only token
reading nothing, identical and equally slow refusals, the delay without a
lockout); the inbox (every file state, download only for a received file,
status and test changes, a recruiter's narrower view); and the earlier
rail, modal, 404 and 320 px checks.

**Never done:** a screen reader, speech input, zoom and reflow testing, or
an accessibility audit (as `/accessibility` says); Safari, Firefox and
mobile browsers; anything against a hosted Supabase project.
