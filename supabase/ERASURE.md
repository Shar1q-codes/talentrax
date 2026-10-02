# Candidate erasure

What happens when a candidate asks to be deleted, and why. The mechanism
is `migrations/20261001000600_candidate_erasure.sql`, with the floor as
migration 10 (`20261001001000_retention_floor_by_record.sql`) computes it;
the tests are `tests/database/20_erasure.test.sql` and
`25_retention_floor.test.sql`.

**This is an engineering reading of the rules, not legal advice.** Every
period below is cited, every uncertainty is marked, and the open questions
are CLIENT-CONFIRM.md items 19 to 23. Counsel should review this file
before real candidate data exists.

## The law it is built on

| Rule | What it requires | Applies here |
| --- | --- | --- |
| [29 CFR 1627.4(a)](https://www.law.cornell.edu/cfr/text/29/1627.4) (ADEA) | Employment agencies keep placements, referrals, job orders, applications and resumes "for a period of 1 year from the date of the action to which the records relate", and until final disposition of an enforcement action | Yes. Talentrax is an employment agency. Active rule. |
| [29 CFR 1602.14](https://www.law.cornell.edu/cfr/text/29/1602.14) (Title VII, ADA, GINA) | Personnel and employment records, applications included, for one year from the record or the personnel action, whichever is later; until final disposition once a charge is filed | Yes. Active rule. |
| [Cal. Gov. Code §12946](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=12946) (FEHA) | Employers **and employment agencies** keep applications and employment referral records for four years after creation or the employment action, and through any complaint | When the candidate, or a job or requisition they are linked to, is in California. Possibly every candidate if Talentrax operates from California: item 20. |
| [41 CFR 60-1.12(a)](https://www.law.cornell.edu/cfr/text/41/60-1.12) (OFCCP) | Two years for covered federal contractors and subcontractors, one year below 150 employees or a $150,000 contract; internet expressions of interest included | Only if Talentrax holds a covered federal contract or subcontract. **Inactive** until item 19 is answered. |
| [Cal. Civ. Code §1798.105(d)(8)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.105) and [§1798.145(a)(1)(A)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.145) (CCPA/CPRA) | No duty to delete what is reasonably necessary to "comply with a legal obligation". The applicant exemption expired on 1 January 2023 | This exception is what makes deferral lawful. Whether the CCPA applies at all depends on Talentrax meeting its thresholds: item 22. |
| [11 CCR §7022(f)](https://www.law.cornell.edu/regulations/california/11-CCR-7022) | A business that keeps data under an exception must delete what the exception does not cover, explain the basis, and not use what it keeps for any other purpose | Why deferral erases part of the file at once, and restricts the rest. |
| [11 CCR §7022(d)](https://www.law.cornell.edu/regulations/california/11-CCR-7022) | Archived and backup systems may be erased when restored or next used | Supabase backups and point-in-time recovery: see "Backups". |
| [11 CCR §7101](https://www.law.cornell.edu/regulations/california/11-CCR-7101) | Keep a record of each request and the response for at least 24 months; do not use it for anything else | Why `deletion_requests` survives the erasure, and why it holds no personal data. |

**Pay-transparency and wage-record laws do not set a floor for candidate
data here.** California ([Lab. Code §432.3(c)(4)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=432.3):
job title and wage rate history for the duration of employment plus three
years), Colorado ([C.R.S. 8-5-202](https://colorado.public.law/statutes/crs_8-5-202):
plus two years) and Illinois (820 ILCS 112, as amended by
[Public Act 103-0539](https://my.ilga.gov/ftp/legislation/103/BillStatus/XML/10300HB3129.xml):
five years for each position's pay scale, benefits and posting) all bind
the **employer**, about its **employees** or its **positions**. On a direct
hire the employer is the client. The Illinois posting records attach to
`jobs`, which a candidate erasure never touches. New York's original
record-keeping clause was removed by a later amendment (secondary source:
[Bond Schoeneck & King](https://bsk.com/news-events-videos/new-york-state-pay-transparency-law-amendments-signed-into-law)),
which should be confirmed against the statute.

**Unless Talentrax employs contract workers itself.** The site offers a
Contract engagement. If Talentrax is the W-2 employer of record, it owes its
own payroll records ([29 CFR 516.5](https://www.law.cornell.edu/cfr/text/29/516.5):
three years), Form I-9 ([USCIS](https://www.uscis.gov/i-9-central/form-i-9-resources/handbook-for-employers-m-274/100-retaining-form-i-9):
three years after hire or one year after employment ends, whichever is
later), and the wage-rate history above. None of that lives in this schema.
Item 21.

### What is genuinely unclear

- **Whether a recruiter-sourced profile is an agency record.** 1627.4(a)
  covers "any other form of employment inquiry or record of any individual
  which identifies his qualifications for employment, whether for a known
  job opening at the time of submission or for future referral". **Since
  migration 10 the schema takes the narrower reading**: the candidate row
  is not a record, so a sourced profile with no resume, application
  material, referral or placement on file has no floor and is erased on
  schedule. A sourced profile holding a resume (a `candidate_documents`
  row) is floored by it. The conservative reading, which migration 6
  took, gave every candidate a year from their last edit. This is a
  deliberate choice that counsel should confirm: item 23.
- **Which state's law applies.** The schema applies FEHA when the candidate
  or a linked job or requisition is in California. Where the agency is, and
  where the candidate lives, may each matter. Item 20.
- **Consent and opt-out records.** A record that someone opted out of texts
  is evidence against a TCPA claim. Keeping it is a choice about defending
  claims, not a legal obligation, so it is erased with everything else.
  A suppression list that survives erasure (a keyed hash of the contact
  point and a date, nothing else) is designed but **not built**: it belongs
  in its own migration, and needs decisions first. See "Suppression,
  undecided" below, and item 23.

## How the floor is computed

Per rule, from the records that rule covers - never from the file as a
whole. `private.retention_floor()`:

1. Takes every **active** rule that applies: nationwide rules always, a
   state rule when the candidate, their intake, a job they applied to or a
   requisition they were submitted to is in that state.
2. For each, finds the **latest record of the kinds it names**
   (`retention_rules.record_kinds`) and adds the rule's period. A rule with
   no record of its kinds contributes nothing.
3. The floor is the latest of those. The **basis** shown to the candidate
   is the rules whose own floor is still in the future.

| Kind | Tables |
| --- | --- |
| `application` | `applications`; `candidate_documents` other than resumes (cover letters, certifications, other material) |
| `resume` | `resume_submissions` (the resume form: the application as submitted); `candidate_documents` of kind `resume` |
| `referral` | `submissions`, `submission_events` |
| `personnel_action` | `interviews`, `offers` |
| `placement` | `placements` |

| Rule | Period | Kinds |
| --- | --- | --- |
| `adea-employment-agency` | 1 year | application, resume, referral, placement |
| `title-vii-ada-gina` | 1 year | application, resume, referral, personnel_action, placement |
| `ca-feha` (CA) | 4 years | application, resume, referral |
| `ofccp-federal-contractor` (inactive) | 2 years | application, resume, referral, personnel_action, placement |

Job orders (ADEA) are requisitions: the employer's record, which a
candidate erasure never touches, so they do not hold a candidate.

**Not records:** the candidate row, `message_log` and
`candidate_engagement_types`. A recruiter's edit or a logged message does
not move anyone's floor. A candidate with none of the five kinds is
scheduled at once.

**The periods and the kinds are data.** A super_admin edits them in
`retention_rules`, no migration involved. Switching OFCCP on, or changing
any rule, re-dates every open deferral in the same statement (a trigger on
the table), except those under a legal hold. `00_schema.test.sql` pins the
seeded values, so a change to them in a migration is deliberate.

**The stored date is not the gate.** `deferred_until` is what the candidate
sees. The worker recomputes the floor from live records whenever it
considers a request, and also takes a deferred request whose live floor has
passed although its stored date has not. A floor never outlives the
records it came from.

## Suppression, undecided

Erasing `communication_consents` removes the proof that a number or address
opted out, so nothing stops it being re-sourced and contacted. A
suppression row that survives erasure would fix that. It is **not built**.
The engineering reading:

- **It is personal data.** A hash whose whole purpose is to match the same
  number again is pseudonymised, not deidentified
  ([Civ. Code §1798.140](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140)).
  An unkeyed hash of a ten-digit number is also reversible by enumeration,
  so the hash has to be an HMAC under a key kept apart from the data.
- **Its basis is 11 CCR §7022(e), not the legal-obligation exception.** That
  subsection lets a business "retain a record of the request for the
  purpose of ensuring that the consumer's personal information remains
  deleted", which is exactly this, and it limits the row to that purpose.
  The TCPA does not oblige keeping it for recruiting calls and texts: the
  five-year do-not-call duty
  ([47 CFR 64.1200(d)(6)](https://www.law.cornell.edu/cfr/text/47/64.1200))
  binds telemarketing, which recruiting usually is not. The consent rule for
  autodialed and prerecorded calls does reach recruiting calls, but it sets
  no record-keeping duty. So keeping the row is prudent under the TCPA and
  permitted by the CCPA, not required.
- **A returning person is not blocked.** If they apply again and give the
  number with fresh consent, that consent is theirs and supersedes the old
  opt-out: the suppression row goes and the new consent row is the evidence.
  What it blocks is a number re-entered without the person's own fresh
  consent (sourced, imported, typed in by a recruiter).

What has to be decided before it is built, in its own migration: where the
HMAC key lives (it can never be rotated without the plaintext, which is
gone); how to write the row without the audit log or a shared timestamp
linking it back to the erased candidate; and counsel's view (item 23).

## Requested, deferred, executed

A request is not a deletion. Each state is visible to the candidate on
their own `deletion_requests` row.

```
requested ──accept──▶ scheduled ──execute_after──▶ executed
    │                    │
    │                 deferred ──execute_after──▶ part erased, rest restricted
    │                    │                             │
    │                    │                     deferred_until, or hold released
    │                    │                             ▼
    │                    │                          executed
    ├──refuse──▶ refused
    └──cancel──▶ cancelled   (from requested, scheduled, or deferred before any erasure)
```

- **requested**: recorded with its manner (self-service, email, phone,
  mail, in person, authorised agent). Not yet verified, so nothing is
  restricted.
- **scheduled**: verified and accepted, with no floor in the way. Erasure
  runs at `execute_after`, a grace window the administrator chooses.
- **deferred**: verified and accepted, but records are under a floor or a
  legal hold. At `execute_after` everything not covered goes. The rest is
  restricted, and goes automatically at `deferred_until`, or when the hold
  is released (`deferred_until` NULL, `deferral_basis = {legal_hold}`).
  **This is the "lawfully deferred, will execute automatically" state.**
  The candidate sees the date and the rule codes.
- **executed**: everything that can go has gone.
- **refused**: cannot be honoured, for example an unverifiable requester.
  This is never used for "we must keep it". That is a deferral.
- **cancelled**: withdrawn before anything was erased. Once part of the
  file has gone, the request can no longer be cancelled.

From acceptance on, the candidate is **restricted** (11 CCR 7022(f)(3)):
- They are hidden from every staff role except administrators.
- Nothing new can be created for them. Opt-outs are the only exception.
- Email and SMS opt-outs are recorded at once.

## Per table

**Floor?** says whether the retention floor covers the table. **While
deferred** is what happens at the first execution step if the request is
deferred. **Executed** is the final state.

| Table | Floor? | While deferred | Executed | Why |
| --- | --- | --- | --- | --- |
| `candidates` | **No** since migration 10: its timestamps date nothing. Held while deferred, because every record references it | Held intact, restricted | **Anonymised in place**: a tombstone with `erased_at`, no name, contact, location, desk, salary or account link. A CHECK makes that exhaustive | Submissions, offers and placements reference it with `ON DELETE RESTRICT`, and are the employer's transaction. A placement must still point at *a* candidate, just not a person. |
| `resume_submissions` | Yes, `resume`: the application as submitted (1627.4, FEHA) | Held intact | **Erased**. Rows matched by `candidate_id` or by the same mailbox; the resume object is queued for Storage | Nothing references it; once the floor passes nothing requires it. |
| `candidate_documents`, originals | Yes: application materials | Held intact | **Erased**; objects queued | The resume is the core of the record while the floor runs, and has no other value afterwards. |
| `candidate_documents`, scrubbed | Yes: the referral record, what the employer received | Held intact | **Erased**; objects queued; `submissions.shared_document_id` cleared first | The employer keeps its own copy. Talentrax's copy proves what was sent, which matters only while a claim could be brought. |
| `candidate_embeddings` | **No**: derived from the documents, regenerable, not a record of any action | **Erased at once** | Erased | §7022(f)(2) reaches it during deferral, as it now reaches `message_log` and `candidate_engagement_types`. Embeddings can also leak the text they encode. |
| `candidate_engagement_types` | **No** since migration 10 | **Erased at once** | Erased | A preference, not a transaction, and no rule names it. |
| `applications` | Yes | Held intact | **Erased**; `submissions.application_id` cleared first | The candidate's own act. Nothing about the employer depends on it. |
| `submissions` | Yes: the referral (1627.4 names referrals) | Held intact | **Anonymised**: `bdm_notes`, `employer_response`, the document and application links cleared. Consent flags and dates, BDM decision, send date, rate and status kept | The employer's transaction, and the proof that the consent and approval gate held. Kept after the floor for the placement's fee and guarantee terms. |
| `submission_events` | Yes | Held intact | **Anonymised**: `notes` cleared. Event types, statuses, actors and dates kept. The erasure adds no events of its own | Append-only for everyone. The one exception: an erasure may clear the notes of its own candidate's events. |
| `interviews` | Yes | Held intact | **Anonymised**: `feedback`, `outcome`, `location_or_link` cleared. `interviewer_names` kept | What was said about the candidate goes. The interviewers are the employer's people: not the requester's data, and part of the employer's record. |
| `offers` | Yes | Held intact | **Anonymised**: `decline_reason` cleared. Salary, dates and status kept | The offer terms are the employer's and the basis of a fee. The reason for declining is the candidate's. |
| `placements` | Yes, plus tax and contract records of the fee | Held intact | **Untouched** | No column identifies the person. It points at the tombstone. **This is pseudonymous, not anonymous**: the employer knows who started on that date. That is why it is kept under the legal-obligation exception, not as deidentified data. |
| `activities` | Yes: records made or kept about the candidate | Held intact | **Erased**: every activity on the candidate or on their applications, submissions, interviews, offers and placements | Free-text notes about the person have no use once the floor has passed. Employer-relationship notes filed against the submission go too. That is a deliberate cost. |
| `communication_consents` | No legal floor (see "unclear") | Held, with opt-outs recorded at acceptance as evidence the contact stopped | **Erased** | With the address gone there is nobody left to contact. |
| `message_log` | **No** since migration 10 | **Erased at once** | Erased | Addresses and bodies are the candidate's, and no rule names them. Keeping them as evidence would be a choice about defending claims, like consents. |
| `profiles` + `auth.users` | Not a record | Kept working, so the candidate can sign in and see their request | **Anonymised and disabled**: name and email cleared, deactivated. Login address, phone, password, metadata, identities, sessions, MFA factors, one-time tokens and GoTrue's own `auth.audit_log_entries` cleared | `profiles` is referenced by `created_by` across the schema and cannot be deleted. Staff accounts are never touched by a candidate erasure. |
| `private.intake_events` | n/a | Untouched | **Untouched**: HMACs of an address and an email, no plaintext, deleted after 48 hours by pg_cron | The rate-limit ledger (migration 9). It expires long before the 45 days a request may take to answer. |
| `private.sign_in_failures`, `private.sign_in_leases` | n/a | Untouched | **Untouched**: an HMAC of the address typed at staff sign-in, no plaintext. Failures are deleted after 24 hours by pg_cron; a lease lasts seconds | The sign-in delay (migrations 14 and 16). Any address typed counts, an account or not; it expires long before a request could be answered. |
| `audit_log` | n/a | Untouched | **Untouched** | Append-only for every role, and now never holds personal data at all (below). |
| `deletion_requests` | 11 CCR §7101: 24 months minimum | n/a | **Kept**: dates, manner, decision, basis codes, row counts | The request record. It holds no personal data, so keeping it is not keeping the candidate. |

## The audit log was the bug

`private.audit_row()` stored every row whole, before and after, plus the
caller's IP address and user agent, in a table no role can edit.
- A candidate's name, email, phone, salary expectation and the notes about
  them, and the IP they applied from, would have outlived any erasure.
- The erasure itself would have copied every value it cleared into the log,
  as the "old" side of each update.

Now:
- Every string, array, JSON and network column is **redacted** unless
  `private.column_classification` marks it non-personal. All 187
  string-like columns are classified, 65 of them personal. An unclassified
  column is redacted, so a new column fails safe. `00_schema.test.sql`
  fails until it is classified.
- The log records **that** a personal column changed, by name
  (`_personal_columns`), never its value.
- IP address and user agent are recorded **for staff actions only**.
- `20_erasure.test.sql` asserts no fragment of the test candidate's data
  appears anywhere in `audit_log` after the full lifecycle. Restoring the
  old trigger makes that test fail.

What the log records about a deletion: every state change of the
`deletion_requests` row (who accepted, refused or cancelled it, and when),
and one row per erased or anonymised row, with ids, statuses and
timestamps. No values.

**Rows written before this migration are not rewritten.** The log is
append-only by design, and no production data exists yet, so no real
candidate's data is in it. This migration has to reach production before
the first real candidate does.

## Why a queue, and a function only the worker can call

Erasure is a SECURITY DEFINER function **and** a queue, because neither is
enough alone:
- **A deferred erasure needs nobody to press a button** years later. The
  `deletion_requests` row is the queue entry.
  `public.process_due_deletion_requests()` advances whatever is due, and
  pg_cron runs it every fifteen minutes.
- **Only `service_role` and the migration role can call it.** No
  authenticated role can, administrators included. Administrators accept,
  refuse, cancel and place holds; nobody erases on demand.
- **A failure halfway changes nothing.** Each request is advanced in its
  own subtransaction. If any step fails, every row it touched rolls back,
  outbox rows included. The request records an attempt and the SQLSTATE
  (never the message, which can quote a value), and the next run retries.
  Every step is idempotent.
- **Two workers never take the same request.** Rows are claimed `FOR UPDATE
  SKIP LOCKED`.

## Storage: two systems, one direction of failure

The bytes live in Supabase Storage, which refuses direct deletes from
`storage.objects`. One transaction cannot cover both, so the erasure
writes a row to `storage_erasures` per object **in the same transaction**
that removes the metadata. That's a transactional outbox:
- The metadata and its outbox rows commit together or not at all, so bytes
  are never deleted while a row still points at them.
- The only possible divergence is bytes outliving their row until the
  worker succeeds. Any `pending` row says exactly which.

### The worker

`functions/storage-erasure-worker` (migration 7) drains the outbox. pg_cron
calls it every five minutes through pg_net, with the URL and the service
role key read from Vault (`storage_worker_url`, `storage_worker_key`), set
per environment. Only the service role key gets past its first line.

**The database decides the outcome, not the Storage API.** Measured locally,
a bulk delete answers `200 []` for an object that does not exist, for a
bucket that does not exist, and for a caller not allowed to delete. A worker
that believed that answer would mark a typo'd bucket or a wrong key as
"already gone" and leave every file in place. So:

| What happened | Row | Why it cannot be mistaken |
| --- | --- | --- |
| Present at claim, absent at completion | `done`, outcome `deleted` | Checked in `storage.objects`, which only the Storage API can delete from |
| Absent at claim | `done`, outcome `already_absent` | **Success**: there was nothing to delete. The worker does not even call Storage |
| Worker reports success, object still there | `pending`, error `still_present` | The database refuses the completion |
| Storage unreachable, or an HTTP error | `pending`, error `network` or `http_<status>` | A pending row never carries an outcome; a done row never carries an error |
| Bucket does not exist | `pending`, error `bucket_missing` | Never handed to the worker at all |

**Concurrency.** A claim takes rows `FOR UPDATE SKIP LOCKED` and leases
them: `next_attempt_at` moves five minutes ahead and the row gets a fresh
`claim_token`. Two workers started together take disjoint rows. Every
completion or failure must present the current token, so a worker whose
lease expired cannot overwrite a newer result. A worker that dies loses
nothing: the lease expires and the row is due again.

**A row that keeps failing never blocks the queue, and is never dropped.**
- **Backoff:** each failure doubles the wait, capped at six hours. Claims
  take due rows only, so a failing row steps aside and the rows behind it
  are processed.
- **After eight attempts:** `needs_attention_at` is set, and it goes on
  being retried every six hours, because the object still has to go.

**How anyone notices:**
- `storage_erasure_backlog()` gives pending and needs-attention counts and
  the oldest of each.
- **An hourly pg_cron job fails**, so `cron.job_run_details` records the run
  as failed and the dashboard shows it, while anything needs attention or
  has waited over a day. That catches a worker that was never configured as
  surely as a broken one.
- The worker logs a JSON line at error level whenever a run has failures.

**Not built here:**
- **Delivery of those signals to a person.** Log alerting, or a log drain
  to the client's paging tool, is a deploy-time decision, not in this repo.

## Backups

Supabase backups and point-in-time recovery hold erased data until they
expire. §7022(d) permits that, provided the erasure is applied again when a
backup is restored. Every executed request survives in
`deletion_requests`, and execution is idempotent. The restore runbook must
therefore re-run erasure for every `executed` request before the restored
database goes back into use.

## The soft-delete finding

The brief reported that soft delete is blocked by its own SELECT policy. I
couldn't reproduce it. Every role entitled to soft-delete a row did so: 17
paths across eleven tables, as recruiter, BDM, full-desk recruiter,
candidate and admin.
- The helpers the permissive SELECT policies call (`current_candidate_id`,
  `can_read_submission`, `is_on_requisition`) re-read the row's own
  `deleted_at`. They read the statement's snapshot, though, which still
  shows the row as live, so the new row passes.
- The restrictive policy admits `deleted_at = now()`, as designed.

The only refusals were a candidate soft-deleting their own candidate row
or application. Both come from `guard_self_service`, the trigger that limits
which columns a candidate may change. That is intended: a candidate leaves
through a deletion request, not an UPDATE. `20_erasure.test.sql` pins the
recruiter path as a regression test. If you have the reproduction the
finding came from, it belongs in that file.
