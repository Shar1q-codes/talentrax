# Storage

Three private buckets, their policies, and the sweep that keeps them clean.
The mechanism is `migrations/20261001000800_storage_buckets.sql`; the tests
are `tests/database/40_storage_policies.test.sql`. Deleting objects is the
erasure worker's job: see `ERASURE.md`.

## The buckets

| Bucket | Holds | Limits |
| --- | --- | --- |
| `candidate-originals` | A candidate's documents as uploaded, contact details and all | PDF, DOC, DOCX; 5 MB |
| `candidate-scrubbed` | Versions with contact details removed: what an employer may receive | same |
| `resume-intake` | The public resume form's uploads, before triage | same |

The limits are the resume form's own (`src/content/upload-resume.ts`).
All three are private. Versioning is off, and a test asserts it: a
versioned delete keeps the old bytes, which would make erasure incomplete.

## Who gets what

| | Original | Scrubbed copy | Intake resume |
| --- | --- | --- | --- |
| The candidate | read, upload | read | no |
| Recruiter who manages them | read, upload | read, upload | read, if the row is routed to them |
| Another recruiter | no | no | no |
| BDM deciding on a submission | **no** | read | no |
| Administrator | read, upload | read, upload | read |
| Employer user | **no** | read, only a copy sent to their employer | no |
| Another employer | no | no | no |
| anon | no | no | no, not even what they uploaded |
| Anyone, overwrite | **no** | **no** | **no** |
| Anyone but the worker, delete | **no** | **no** | **no** |

For a **restricted** candidate (an accepted deletion request), only the
candidate and administrators can read anything, and nobody can upload.

**What a refused caller gets: 400 from the Storage API**, the same answer
as for an object that does not exist. Measured against the local API: an
employer downloading an original, anon downloading anything, a re-upload,
an upsert, an upload to an unnamed path and a wrong file type all answer
400. A caller learns nothing about whether a path exists.

## How the original stays out of reach

**Originals and scrubbed copies are in different buckets.** Each bucket's
policy admits a different set of roles. An employer who knows an
original's exact path gets nothing from the originals bucket, because its
policy does not admit them. In the scrubbed bucket that path does not
exist, and they cannot plant an object there. The path is not the secret;
the policy is.

**Every object is named by a row.** An object can be read or uploaded only
where a live row names exactly that path:
- `candidate_documents.storage_path` for the two document buckets, with
  `is_original` matching the bucket;
- `resume_submissions.resume_storage_path` for intake.

The row is written first and the upload goes to the path it names.

**Intake paths are assigned by the server.**
- anon can no longer set `resume_storage_path`.
- A CHECK requires it to sit under the row's own id, so one intake row can
  never point at another's file.
- The public form uploads through a signed upload URL, which a trusted
  server mints for one intake row. There is no intake upload policy at all.

## The orphan sweep

Hourly, pg_cron runs `public.sweep_orphaned_storage_objects()`, which
queues two kinds of unwanted object for the worker:

| Reason | What | Example |
| --- | --- | --- |
| `orphan` | No row names it, and it is older than the grace period (an hour) | A signed upload that completed after the erasure had already deleted its row; a row that never committed |
| `post_restriction` | A row names it, but the upload completed **after** the candidate's deletion request was accepted | A signed upload URL minted before the restriction, used after it |

What the sweep leaves alone:
- **A restricted candidate's files from before the restriction.** They are
  the records the retention floor keeps.
- **A soft-deleted document's file.** Soft delete is reversible; erasure is
  what removes bytes.
- **An unnamed file inside the grace period.** Its row may still be in an
  uncommitted transaction.

Queueing is idempotent: one pending row per object, whoever queues it.
