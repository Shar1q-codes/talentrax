-- Rolls back 20261001001600_sign_in_delay_not_lockout.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Back to migration 14's limit: five attempts in fifteen minutes, then
-- refused. Counted failures are dropped: the old table counted attempts.

drop function public.sign_in_end(text, uuid, boolean);
drop function public.sign_in_begin(text);
drop function private.sign_in_delay_ms(integer);
drop table private.sign_in_leases;

truncate private.sign_in_failures;
alter index private.sign_in_failures_key_idx rename to sign_in_attempts_key_idx;
alter table private.sign_in_failures rename to sign_in_attempts;

alter table private.sign_in_settings
  drop column free_failures,
  drop column first_delay,
  drop column max_delay,
  drop column failure_window,
  drop column lease_slack,
  add column max_attempts integer not null default 5 check (max_attempts > 0),
  add column window_length interval not null default interval '15 minutes' check (window_length > interval '0');

create function public.sign_in_attempt(email text)
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  key bytea;
  settings private.sign_in_settings;
  recent integer;
begin
  if email is null or btrim(email) = '' then
    return false;
  end if;
  key := private.sign_in_key(email);
  select * into settings from private.sign_in_settings;
  perform pg_advisory_xact_lock(hashtextextended('sign-in' || encode(key, 'hex'), 0));
  select count(*) into recent
  from private.sign_in_attempts a
  where a.email_key = key and a.occurred_at > now() - settings.window_length;
  if recent >= settings.max_attempts then
    return false;
  end if;
  insert into private.sign_in_attempts (email_key) values (key);
  return true;
end;
$$;
revoke all on function public.sign_in_attempt(text) from public;
grant execute on function public.sign_in_attempt(text) to anon, authenticated;

create or replace function public.sign_in_succeeded()
returns void
language sql volatile security definer
set search_path = ''
as $$
  delete from private.sign_in_attempts
  where coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and auth.jwt() ->> 'email' is not null
    and email_key = private.sign_in_key(auth.jwt() ->> 'email')
$$;

create or replace function public.reset_sign_in_attempts(email text)
returns integer
language sql volatile security definer
set search_path = ''
as $$
  with cleared as (
    delete from private.sign_in_attempts a
    where a.email_key = private.sign_in_key(email)
    returning 1
  )
  select count(*)::integer from cleared
$$;
revoke all on function public.reset_sign_in_attempts(text) from public, anon, authenticated;
grant execute on function public.reset_sign_in_attempts(text) to service_role;

create or replace function private.purge_sign_in_attempts()
returns void
language sql security definer
set search_path = ''
as $$
  delete from private.sign_in_attempts where occurred_at < now() - interval '24 hours'
$$;
