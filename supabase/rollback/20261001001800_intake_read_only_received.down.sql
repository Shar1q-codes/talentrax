-- Rolls back 20261001001800_intake_read_only_received.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Intake files become readable whether or not they passed the check.

create or replace function private.storage_can_read_intake(object_name text)
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

drop function public.resume_upload_for_check(uuid);
