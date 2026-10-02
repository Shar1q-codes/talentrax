-- =============================================================================
-- 8. STORAGE BUCKETS AND THEIR POLICIES
--
-- Three private buckets, one per kind of file:
--
--   candidate-originals  a candidate's documents as uploaded: contact
--                        details and all. The candidate and the staff who
--                        manage them. Never an employer, never a BDM.
--   candidate-scrubbed   the versions with contact details removed. The
--                        candidate, staff who can see the candidate, and an
--                        employer user for a copy sent to their employer.
--   resume-intake        the public resume form's uploads, before triage.
--                        Administrators and the recruiter the row is routed to.
--
-- ORIGINALS AND SCRUBBED COPIES ARE IN DIFFERENT BUCKETS. A policy on one
-- bucket cannot leak the other, so a role allowed a scrubbed copy reaches
-- nothing by guessing an original's path: in the scrubbed bucket that path
-- does not exist, and the originals bucket's policy does not admit them.
-- The path is not the secret; the policy is.
--
-- EVERY OBJECT IS NAMED BY A ROW. An object may be read or uploaded only
-- where a live row names exactly that path: candidate_documents.storage_path
-- for the two document buckets, resume_submissions.resume_storage_path for
-- intake. The row is written first and the upload goes to the path it
-- names; an upload to any other path is refused.
--
-- NOBODY OVERWRITES AND NOBODY DELETES. There is no UPDATE and no DELETE
-- policy on storage.objects, so an upsert is refused, a second upload to the
-- same path fails, and only the service role - the erasure worker - removes
-- anything. An original is uploaded once and never changed (migration 3);
-- a corrected scrubbed copy is a new version with a new row and a new path.
--
-- anon has no policy at all. Public form uploads go through a signed upload
-- URL that a trusted server mints for one intake row, never through anon.
--
-- Limits mirror the resume form (src/content/upload-resume.ts): PDF, DOC or
-- DOCX, up to 5 MB.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select b, b, false, 5242880, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
from unnest(array['candidate-originals', 'candidate-scrubbed', 'resume-intake']) as b
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Intake paths are assigned by the server, never by the form.
-- anon could set resume_storage_path until now; it can no longer name an
-- object at all. The server that mints the signed upload URL sets the path,
-- and the path must sit under the row's own id, so one intake row can never
-- point at another's file.
-- -----------------------------------------------------------------------------
revoke insert (resume_storage_path) on public.resume_submissions from anon;
alter table public.resume_submissions
  add constraint resume_submissions_path_is_own
    check (resume_storage_path is null or resume_storage_path like id::text || '/%');
create unique index resume_submissions_resume_storage_path_key
  on public.resume_submissions (resume_storage_path) where resume_storage_path is not null;

-- -----------------------------------------------------------------------------
-- Who may read and upload. SECURITY DEFINER, like every other access helper:
-- the Storage API connects as the caller's role with their JWT, and these
-- consult candidate_documents and resume_submissions through the same
-- visibility rules the tables themselves use.
-- -----------------------------------------------------------------------------

create function private.storage_can_read_original(object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.candidate_documents d
    where d.storage_path = object_name
      and d.is_original
      and d.deleted_at is null
      and (private.is_self_candidate(d.candidate_id) or private.can_manage_candidate(d.candidate_id))
  )
$$;

create function private.storage_can_read_scrubbed(object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.candidate_documents d
    where d.storage_path = object_name
      and not d.is_original
      and d.deleted_at is null
      and (
        private.is_self_candidate(d.candidate_id)
        or private.staff_can_read_candidate(d.candidate_id)
        -- The employer_submission_documents rule: a copy actually sent to
        -- this employer, and nothing for a restricted candidate.
        or (
          private.has_role('employer_user')
          and not private.is_restricted_candidate(d.candidate_id)
          and exists (
            select 1 from public.submissions s
            join public.requisitions r on r.id = s.requisition_id
            where s.shared_document_id = d.id
              and s.sent_to_employer_at is not null
              and s.deleted_at is null
              and r.deleted_at is null
              and r.employer_id = private.current_employer_id()
          )
        )
      )
  )
$$;

create function private.storage_can_read_intake(object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.resume_submissions rs
    where rs.resume_storage_path = object_name
      and rs.deleted_at is null
      and (
        private.is_admin()
        or (private.has_role('recruiter', 'full_desk_recruiter')
            and rs.owner_id = private.current_profile_id())
      )
  )
$$;

-- An original: the candidate themselves, or staff who manage them. Nothing
-- for a restricted candidate, by anyone.
create function private.storage_can_upload_original(object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.candidate_documents d
    where d.storage_path = object_name
      and d.is_original
      and d.deleted_at is null
      and not private.is_restricted_candidate(d.candidate_id)
      and (private.is_self_candidate(d.candidate_id) or private.can_manage_candidate(d.candidate_id))
  )
$$;

-- A scrubbed copy is staff work: only those who manage the candidate.
create function private.storage_can_upload_scrubbed(object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.candidate_documents d
    where d.storage_path = object_name
      and not d.is_original
      and d.deleted_at is null
      and not private.is_restricted_candidate(d.candidate_id)
      and private.can_manage_candidate(d.candidate_id)
  )
$$;

revoke all on function
  private.storage_can_read_original(text), private.storage_can_read_scrubbed(text),
  private.storage_can_read_intake(text), private.storage_can_upload_original(text),
  private.storage_can_upload_scrubbed(text)
from public, anon;
grant execute on function
  private.storage_can_read_original(text), private.storage_can_read_scrubbed(text),
  private.storage_can_read_intake(text), private.storage_can_upload_original(text),
  private.storage_can_upload_scrubbed(text)
to authenticated, service_role;

create policy talentrax_originals_read on storage.objects
  for select to authenticated
  using (bucket_id = 'candidate-originals' and private.storage_can_read_original(name));
create policy talentrax_scrubbed_read on storage.objects
  for select to authenticated
  using (bucket_id = 'candidate-scrubbed' and private.storage_can_read_scrubbed(name));
create policy talentrax_intake_read on storage.objects
  for select to authenticated
  using (bucket_id = 'resume-intake' and private.storage_can_read_intake(name));

create policy talentrax_originals_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'candidate-originals' and private.storage_can_upload_original(name));
create policy talentrax_scrubbed_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'candidate-scrubbed' and private.storage_can_upload_scrubbed(name));
-- No intake upload policy: signed upload URLs only. No UPDATE or DELETE
-- policy for any bucket: nobody overwrites, nobody but the worker deletes.

-- -----------------------------------------------------------------------------
-- The orphan sweep.
--
-- Two kinds of object should not be in these buckets, and the sweep queues
-- both for the worker (storage_erasures, migration 7):
--
--   orphan            no live or soft-deleted row names it, and it is older
--                     than the grace period. An upload whose row never
--                     committed, or a signed upload that completed after the
--                     erasure had already removed its row.
--   post_restriction  a row names it, but the upload completed after the
--                     candidate's deletion request was accepted. Data
--                     collected after someone asked to be deleted is not part
--                     of any record a retention floor protects.
--
-- The grace period covers an upload whose row is still in an uncommitted
-- transaction. Soft-deleted rows still count as naming their object:
-- soft delete is reversible, erasure is what removes bytes.
-- -----------------------------------------------------------------------------

alter table public.storage_erasures
  drop constraint storage_erasures_reason_check,
  add constraint storage_erasures_reason_check
    check (reason in ('erasure', 'orphan', 'post_restriction'));

create function public.sweep_orphaned_storage_objects(p_grace interval default interval '1 hour')
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  queued integer;
begin
  with candidates_objects as (
    select o.bucket_id, o.name, o.created_at,
      case o.bucket_id
        when 'resume-intake' then (
          select rs.candidate_id from public.resume_submissions rs where rs.resume_storage_path = o.name)
        else (
          select d.candidate_id from public.candidate_documents d
          where d.storage_path = o.name and d.is_original = (o.bucket_id = 'candidate-originals'))
      end as candidate_id,
      case o.bucket_id
        when 'resume-intake' then exists (
          select 1 from public.resume_submissions rs where rs.resume_storage_path = o.name)
        else exists (
          select 1 from public.candidate_documents d
          where d.storage_path = o.name and d.is_original = (o.bucket_id = 'candidate-originals'))
      end as named
    from storage.objects o
    where o.bucket_id in ('candidate-originals', 'candidate-scrubbed', 'resume-intake')
  ),
  unwanted as (
    select bucket_id, name, 'orphan' as reason
    from candidates_objects
    where not named and created_at < now() - p_grace
    union all
    select c.bucket_id, c.name, 'post_restriction'
    from candidates_objects c
    join public.deletion_requests r
      on r.candidate_id = c.candidate_id and r.status in ('scheduled', 'deferred')
    where c.named and c.created_at > r.accepted_at
  )
  insert into public.storage_erasures (reason, bucket, object_path)
  select reason, bucket_id, name from unwanted
  on conflict (bucket, object_path) where status = 'pending' do nothing;
  get diagnostics queued = row_count;
  return queued;
end;
$$;

revoke execute on function public.sweep_orphaned_storage_objects(interval) from public, anon, authenticated, service_role;
grant execute on function public.sweep_orphaned_storage_objects(interval) to service_role;

select cron.schedule('sweep-orphaned-storage', '41 * * * *', $$select public.sweep_orphaned_storage_objects()$$);
