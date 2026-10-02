-- =============================================================================
-- Promote an account to a staff role. Including the very first one.
--
-- Run by whoever operates the Supabase project, in its SQL editor (Database >
-- SQL editor), which runs as `postgres`. Locally: `npx supabase db` tooling,
-- or psql against 127.0.0.1:54322. There is no self-service path to a staff
-- role and none in the app: this file is the way.
--
-- BEFORE RUNNING
--   1. The person has an account. In the dashboard: Authentication > Users >
--      Add user > Create new user, with their real work address, a strong
--      password you hand over out of band, and "Auto Confirm User" ticked.
--      The signup trigger gives every new account the job_seeker role; this
--      file changes it.
--   2. Read supabase/STAFF-ACCESS.md. Before go-live there must be two
--      super_admin accounts, so nobody ever has to reset their own factor.
--
-- THEN: edit the two values in the first SELECT below, and run the whole file.
--
-- SAFE TO RUN TWICE. If the account already holds that role and is active,
-- nothing changes and it says so. Every refusal changes nothing: the whole
-- file is one transaction.
--
-- It refuses:
--   * the placeholder address, an address with no account, or one whose
--     email is not confirmed;
--   * a role that is not staff (employer_user, job_seeker);
--   * a deleted profile (restoring one is a separate, deliberate decision);
--   * an employer_user account (it belongs to an employer; make a new one);
--   * a job_seeker account with a candidate record (a real candidate; staff
--     get a separate account).
--
-- AFTER: the person signs in at /staff/sign-in and sets up their
-- authenticator. Until they do, the role reads nothing (migration 14).
--
-- The change goes through the profiles table's own triggers, so the audit log
-- records it, with no actor (it was the operator, not an app user).
-- =============================================================================

begin;

select
  set_config('promote_staff.email', 'person@their-domain.example', true),  -- EDIT: their address
  set_config('promote_staff.role',  'super_admin',                 true);  -- EDIT: super_admin, platform_admin, bdm, full_desk_recruiter, recruiter, research_analyst, content_manager or marketing_manager

do $$
declare
  target_email text := btrim(current_setting('promote_staff.email'));
  target_role_text text := btrim(current_setting('promote_staff.role'));
  target_role public.app_role;
  user_id uuid;
  confirmed timestamptz;
  profile public.profiles;
begin
  if target_email = 'person@their-domain.example' or target_email = '' then
    raise exception 'Edit the address in the first SELECT of this file before running it.';
  end if;

  begin
    target_role := target_role_text::public.app_role;
  exception when invalid_text_representation then
    raise exception '"%" is not a role.', target_role_text;
  end;
  if target_role in ('employer_user', 'job_seeker') then
    raise exception '% is not a staff role. This file only promotes to staff.', target_role;
  end if;

  select u.id, u.email_confirmed_at into user_id, confirmed
  from auth.users u
  where lower(u.email) = lower(target_email);
  if user_id is null then
    raise exception 'No account has the address %. Create it first: Authentication > Users > Add user, with Auto Confirm.', target_email;
  end if;
  if confirmed is null then
    raise exception 'The account % has not confirmed its email. Confirm it (or recreate it with Auto Confirm) first.', target_email;
  end if;

  select * into profile from public.profiles p where p.id = user_id;
  if profile.id is null then
    raise exception 'The account % has no profile row. The signup trigger should have made one; investigate before going on.', target_email;
  end if;
  if profile.deleted_at is not null then
    raise exception 'The profile for % is deleted. Restoring it is a separate decision; this file does not.', target_email;
  end if;
  if profile.role = 'employer_user' then
    raise exception '% is an employer user, attached to an employer. Staff get their own account.', target_email;
  end if;
  if profile.role = 'job_seeker'
     and exists (select 1 from public.candidates c where c.profile_id = user_id) then
    raise exception '% has a candidate record: it is a real candidate''s account. Staff get their own account.', target_email;
  end if;

  if profile.role = target_role and profile.is_active then
    raise notice '% already holds % and is active. Nothing changed.', target_email, target_role;
    return;
  end if;

  update public.profiles
     set role = target_role, is_active = true
   where id = user_id;
  raise notice '% is now % (was %). Next: they sign in at /staff/sign-in and set up their authenticator.',
    target_email, target_role, profile.role;
end;
$$;

-- What the account looks like now.
select u.email, p.role, p.is_active, p.deleted_at,
       (select count(*) from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified') as verified_factors
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower(btrim(current_setting('promote_staff.email')));

commit;
