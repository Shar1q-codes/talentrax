# Talentrax Global ATS — database

The ATS schema for Supabase/Postgres, as SQL migrations. **The migrations are
the source of truth.** Nothing is created by clicking in the dashboard; a
change made there and not here does not exist.

Schema only, plus the plumbing to reach it: `src/lib/supabase/` (env guard
and one client constructor) and the generated `src/lib/database.types.ts`.
No page, form or API route calls the client yet.

## Layout

| Path | What it is |
| --- | --- |
| `migrations/20261001000100_foundation.sql` | Extensions, `app_role`, profiles and the signup trigger, the `private.*` RLS helpers, the audit log, row-stamping triggers, and the taxonomy seeded from `src/content/taxonomy.ts` |
| `migrations/20261001000200_crm_core.sql` | Employers, contacts, leads, requisitions, assignments, jobs, contact-form intake |
| `migrations/20261001000300_candidates_pipeline.sql` | Resume-form intake, candidates, documents, embeddings, applications, submissions and their timeline, interviews, offers, placements |
| `migrations/20261001000400_activities_comms_content.sql` | Activities, communication consents, templates, message log, CMS content |
| `migrations/20261001000500_row_level_security.sql` | Visibility helpers, privileges, every policy, the job board and employer views |
| `migrations/20261001000600_candidate_erasure.sql` | Deletion requests, retention rules, legal holds, the erasure worker, the storage outbox, and the PII-free audit log |
| `migrations/20261001000700_storage_worker.sql` | The outbox's leases, outcomes and backoff, the worker's schedule, and its health check |
| `functions/storage-erasure-worker/` | The Edge Function that deletes queued objects through the Storage API |
| `rollback/*.down.sql` | Reverse of each migration, for local development only |
| `tests/database/*.test.sql` | pgTAP: catalog-wide structural checks, then behaviour per role |
| `seed.sql` | One user per role for local testing, all fake |
| `LOCAL.md` | The local workflow, seeded logins, and the path to hosted |
| `ERASURE.md` | What a deletion request does to each table, the retention law behind it, and why |

## Running it

The full local workflow, the seeded logins and the path to hosted are in
**`LOCAL.md`**. The short version (Docker required):

```bash
npx supabase start          # first time: pulls the local stack
npx supabase db reset       # empty database -> migrations -> seed.sql
npx supabase test db        # runs tests/database/*.test.sql
```

Seed users sign in with the password `local-password-only`, for example
`recruiter@example.test`. The domain is reserved and can never deliver mail.

**Rolling back.** Supabase migrations only go forward, and on a hosted
project that is the rule: fix forward with a new migration. Locally,
`supabase db reset` rebuilds from nothing. The `rollback/` scripts exist to
prove the migrations are cleanly reversible, and they destroy the audit log
along with everything else. Apply them newest first, and never against
anything but a throwaway database.

## Decisions worth knowing

**Applications and submissions are different tables.** An application is a
candidate applying of their own accord. A submission is Talentrax putting a
candidate forward, and only a recruiter creates one. A submission may point
at the application it came from. Offers hang off submissions and placements
off offers, so one chain of foreign keys runs from "applied" to "started".

**The gate is a CHECK constraint.** `sent_to_employer_at` cannot be set
unless the candidate's consent is recorded and either the BDM approved or
it is a direct submission. It binds service_role and migrations too.
*Who* may send is a trigger (`private.submission_workflow`): the assigned
BDM, an admin, or a full_desk_recruiter for their own direct submission.
Never a recruiter. Only full_desk_recruiter and above can flag a submission
direct at all, and that part is RLS, as specified.

**Three public forms, three intake tables.** Request Talent writes `leads`,
Upload Resume writes `resume_submissions`, Contact writes
`contact_messages`. Those are the only tables anon can touch: INSERT only,
on the form's own columns, with policies that stop it setting anything
internal. The resume form deliberately does not write `candidates`.
Candidates carry a unique email, and an anonymous insert failing on it would
tell anyone whether an address is on file. Staff triage intake into
candidates.

**anon can SELECT nothing**, not taxonomy and not published jobs. When the
site reads jobs from here, it reads `public_jobs` server-side with a server
key, never the anon key in a browser.

**Employers read views, not tables.** RLS filters rows, not columns, and a
requisition's `internal_notes` or a candidate's phone number must not be one
`select *` away. `employer_user` has no base-table policy at all. It reads
`employer_requisitions`, `employer_submissions` (sent submissions only;
contact details stay NULL until a live placement exists) and
`employer_submission_documents` (only the scrubbed version attached to the
submission). These views run with the owner's rights, filter to the caller's
employer inside themselves, and are SELECT-only. Supabase's linter flags
owner-rights views, and here that is intended.

**Originals are never shared.** A scrubbed document is its own row pointing
at its original (`parent_document_id`, `version`). A composite foreign key
proves it belongs to the same candidate. A submission can only attach a
scrubbed version.

**Taxonomy is referenced by slug.** The site uses slugs, so foreign keys do
too, and constraints can name values such as `'published'` readably. Slugs
are immutable by trigger. A row is retired with `is_active = false`. The
rows the schema's constraints name are `is_system` and cannot be retired.
States are keyed by USPS code (`TX`), which is what the forms and the
JobPosting schema already use.

**Soft delete, and why `deleted_at = now()` is in the hide policies.** No
DELETE policy exists, and DELETE is revoked from every API role,
service_role included. Deleting a row means setting `deleted_at`. Postgres
requires the row an UPDATE produces to stay visible to the caller's SELECT
policies, so a plain "hide deleted rows" policy would refuse every soft
delete by anyone but an admin. A trigger therefore pins `deleted_at` to the
deleting transaction's timestamp, and the hide policy admits
`deleted_at = now()`. The row stays visible only inside the transaction that
deleted it. Who may soft-delete a row is exactly who may update it. Only
admins see or restore deleted rows.

**A deletion request is not a deletion, and deletion is not unconditional.**
A request is recorded, verified and accepted, then executed later by a
worker. Applicant and referral records are under federal and California
retention floors, so an accepted request is often *deferred*: what no rule
covers goes at once, the rest is restricted and goes automatically when the
floor passes. Every decision per table, and the citations, are in
`ERASURE.md`.

**The audit log holds no personal data.** Every string-like column is
redacted from it unless classified non-personal, and IP addresses are kept
for staff actions only. Otherwise an erasure could never be complete: the
log is append-only, and the erasure itself would have written everything it
removed into it.

**The audit log is append-only for everyone.** RLS has no write policy.
UPDATE and DELETE privileges are revoked, and a trigger refuses UPDATE,
DELETE and TRUNCATE even from the owning role, because service_role bypasses
RLS. Only the audit trigger writes it. `audit_settings.retention_days` can
be changed by a super_admin only. Nothing purges yet (CLIENT-CONFIRM.md
item 18).

**Profiles.** Signup always creates a `job_seeker`, whatever the request's
metadata says. Only admins change a role, and nobody changes their own. Only
a super_admin grants super_admin or touches a super_admin's row.

**SMS consent is opt-in and enforced at insert.** `message_log` refuses a
message with no live consent, for every caller. A STOP is
`record_opt_out(...)`: it withdraws the live consent, or writes a withdrawal
record if there was none. A withdrawal cannot be edited away; re-consent is
a new row. Email is opt-out: refused after a withdrawal with no later
opt-in.

**Embeddings are `vector(1536)`** with an HNSW cosine index. HNSW supports up
to 2000 dimensions, so 3072 would need `halfvec`.

**Content approval needs a second person.** A CHECK refuses `approved` or
`published` without a reviewer who is not the author. `author_id` is a
workflow owner, never a byline: the site names nobody.

## Not in this schema, and needed before real data

- **Storage policies.** `candidate_documents` governs the metadata. The
  files will live in Supabase Storage, whose `storage.objects` policies must
  enforce the same rules (originals to staff only, scrubbed versions to the
  employer they were sent to) before any upload is wired up.
- **Email confirmation on the hosted project.** A job seeker can create
  their own candidate row only under their account's email. That is safe
  only if the email is verified. Hosted Supabase confirms emails by default;
  `config.toml` does not locally (`enable_confirmations = false`).
- **Abuse controls on the public forms.** anon inserts straight into three
  tables. Rate limiting, bot protection and the honeypot belong in whatever
  endpoint fronts them. RLS cannot do it.
- **Employer-facing interviews and offers.** Employers see requisitions,
  sent submissions and scrubbed documents. Anything more is a new view, not
  a base-table policy.
