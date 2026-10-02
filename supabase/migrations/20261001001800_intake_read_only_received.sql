-- =============================================================================
-- 18. AN INTAKE FILE IS READABLE ONLY ONCE IT PASSED THE CHECK
--
-- Migration 17 rejects a file whose bytes are not what its name says and
-- queues it for deletion. Until the worker runs, the object is still in the
-- bucket, and migration 8's read policy would have let an administrator, or
-- the recruiter the row is routed to, download it. The inbox (build step 8)
-- must never offer a file that failed verification, and the database should
-- not offer it either, to anyone, through any path.
--
-- Now a resume in the intake bucket is readable only when its row records it
-- received: checked, and kept. That shuts out three kinds of object:
--   * rejected (size, type or signature mismatch), awaiting deletion;
--   * uploaded but not yet checked - the inbox runs the check when the row
--     is opened, and the file becomes readable if it passes;
--   * anything a row names that never got as far as an upload.
-- Who may read a received file is unchanged.
-- =============================================================================

create or replace function private.storage_can_read_intake(object_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.resume_submissions rs
    where rs.resume_storage_path = object_name
      and rs.deleted_at is null
      and rs.resume_received_at is not null
      and rs.resume_rejected_at is null
      and (
        private.is_admin()
        or (private.has_role('recruiter', 'full_desk_recruiter')
            and rs.owner_id = private.current_profile_id())
      )
  )
$$;

-- -----------------------------------------------------------------------------
-- Checking a file later. claim_resume_upload (migration 17) honours a key for
-- fifteen minutes, which is right for handing out an upload slot and wrong
-- for checking a file that arrived but whose check never ran (the browser
-- left first). The inbox runs the check when staff open such a row, through
-- this: the file's declared details for a row with a path and no verdict,
-- whatever its age. service_role only, like the other two.
--   state  uploaded  an object is at the path: check it
--          missing   nothing there (yet, or ever: the hourly expiry decides)
--          received / rejected   already decided
-- -----------------------------------------------------------------------------
create function public.resume_upload_for_check(p_submission_key uuid)
returns table (state text, storage_path text, mime_type text, size_bytes bigint)
language sql stable security definer
set search_path = ''
as $$
  select
    case
      when rs.resume_received_at is not null then 'received'
      when rs.resume_rejected_at is not null then 'rejected'
      when exists (select 1 from storage.objects o
                   where o.bucket_id = 'resume-intake' and o.name = rs.resume_storage_path) then 'uploaded'
      else 'missing'
    end,
    rs.resume_storage_path, rs.resume_mime_type, rs.resume_size_bytes
  from public.resume_submissions rs
  where rs.submission_key = p_submission_key
    and rs.deleted_at is null
    and rs.resume_storage_path is not null
$$;
revoke all on function public.resume_upload_for_check(uuid) from public, anon, authenticated;
grant execute on function public.resume_upload_for_check(uuid) to service_role;
