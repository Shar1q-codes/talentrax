-- Rolls back 20261001001400_staff_second_factor_and_sign_in_limit.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Staff roles count again at aal1, and sign-in attempts are no longer
-- limited.

select cron.unschedule('purge-sign-in-attempts');
drop function private.purge_sign_in_attempts();
drop function public.sign_in_succeeded();
drop function public.sign_in_attempt(text);
drop function private.sign_in_key(text);
drop table private.sign_in_attempts;
drop table private.sign_in_settings;

create or replace function private.current_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.deleted_at is null
$$;
