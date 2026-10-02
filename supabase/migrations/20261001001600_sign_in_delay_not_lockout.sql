-- =============================================================================
-- 16. SIGN-IN: AN INCREASING DELAY, ONE ATTEMPT AT A TIME, NO LOCKOUT
--
-- Replaces migration 14's limit (five attempts in fifteen minutes, then
-- refused). That limit let anyone lock any address out by spending its five
-- attempts. Now:
--
--   * FAILURES are counted per address (an HMAC, as before), over the last
--     hour. A success is not a failure, and passing the second factor clears
--     the count (sign_in_succeeded, unchanged).
--   * Each attempt waits before it is tried, by the count:
--       failures in the last hour   0-2    3    4    5    6    7 or more
--       delay before the attempt    none   1s   2s   4s   8s   10s (ceiling)
--     The first three are free so a typo or two costs a person nothing. Then
--     it doubles, so a guesser pays quickly, and stops at ten seconds, so no
--     request ever hangs for long. A correct password or code is still
--     tried after its delay, and succeeds, however high the count.
--   * ONE ATTEMPT PER ADDRESS AT A TIME. A delay alone only slows a guesser
--     who waits for each answer; one who sends attempts in parallel would
--     pay it once per batch. So an attempt takes a lease on the address for
--     its delay plus a slack for the Auth call, and an attempt that finds
--     the lease taken is answered at once with the generic failure, without
--     being tried. That bounds guessing per address to one attempt per
--     delay, whatever the concurrency: at the ceiling, six a minute.
--     The cost, accepted: while someone keeps an address's lease busy, its
--     owner's attempts are refused too. Only while it is happening - not
--     for fifteen minutes after five tries.
--   * A lease ends when its attempt reports back (sign_in_end), or by
--     itself once its time is up, so a crashed request cannot hold one.
--
-- These functions are callable with the public anon key, so all of this
-- governs attempts made through our sign-in page. It does not govern a
-- password tried straight against Supabase Auth's own API: see
-- supabase/STAFF-ACCESS.md, "Two paths to the password".
--
-- Settings live in private.sign_in_settings, changed by SQL, never in code.
-- =============================================================================

-- The old limit goes. Its rows counted every attempt, not failures, so they
-- mean nothing to the new count and are dropped with it.
drop function public.sign_in_attempt(text);
truncate private.sign_in_attempts;
alter table private.sign_in_attempts rename to sign_in_failures;
alter index private.sign_in_attempts_key_idx rename to sign_in_failures_key_idx;

alter table private.sign_in_settings
  drop column max_attempts,
  drop column window_length,
  add column free_failures integer not null default 3 check (free_failures >= 0),
  add column first_delay interval not null default interval '1 second' check (first_delay > interval '0'),
  add column max_delay interval not null default interval '10 seconds' check (max_delay >= first_delay),
  add column failure_window interval not null default interval '1 hour' check (failure_window > interval '0'),
  -- How long an attempt may take once its delay is over, before its lease
  -- lapses by itself.
  add column lease_slack interval not null default interval '15 seconds' check (lease_slack > interval '0');

create table private.sign_in_leases (
  email_key bytea primary key,
  token uuid not null,
  held_until timestamptz not null
);
revoke all on private.sign_in_leases from public, anon, authenticated, service_role;

-- The delay, in milliseconds, for an address with this many recent failures.
create function private.sign_in_delay_ms(failures integer)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select case
    when failures < s.free_failures then 0
    else (least(
      extract(epoch from s.first_delay) * power(2, failures - s.free_failures),
      extract(epoch from s.max_delay)) * 1000)::integer
  end
  from private.sign_in_settings s
$$;
revoke all on function private.sign_in_delay_ms(integer) from public, anon, authenticated, service_role;

-- Before every password attempt and every second-factor code.
-- Returns {"token": ..., "delay_ms": ...}: wait delay_ms, try, then report
-- with sign_in_end(email, token, failed). Returns NULL when another attempt
-- for this address is in progress: refuse this one, as if it failed, and do
-- not report it.
create function public.sign_in_begin(email text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  key bytea;
  settings private.sign_in_settings;
  failures integer;
  delay_ms integer;
  lease_token uuid := gen_random_uuid();
  taken uuid;
begin
  if email is null or btrim(email) = '' then
    return null;
  end if;
  key := private.sign_in_key(email);
  select * into settings from private.sign_in_settings;

  select count(*) into failures
  from private.sign_in_failures f
  where f.email_key = key and f.occurred_at > now() - settings.failure_window;
  delay_ms := private.sign_in_delay_ms(failures);

  -- Take the lease if it is free or lapsed. One statement, so two attempts
  -- arriving together cannot both take it.
  insert into private.sign_in_leases as l (email_key, token, held_until)
  values (key, lease_token, now() + make_interval(secs => delay_ms / 1000.0) + settings.lease_slack)
  on conflict (email_key) do update
    set token = excluded.token, held_until = excluded.held_until
    where l.held_until <= now()
  returning l.token into taken;

  if taken is distinct from lease_token then
    return null;
  end if;
  return jsonb_build_object('token', lease_token, 'delay_ms', delay_ms);
end;
$$;
revoke all on function public.sign_in_begin(text) from public;
grant execute on function public.sign_in_begin(text) to anon, authenticated;

-- After the attempt: count it if it failed, and give the lease back. A
-- token that no longer holds the lease (it lapsed, someone else has it)
-- releases nothing, but a failure is still counted.
create function public.sign_in_end(email text, token uuid, failed boolean)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  key bytea;
begin
  if email is null or btrim(email) = '' or token is null then
    return;
  end if;
  key := private.sign_in_key(email);
  if failed then
    insert into private.sign_in_failures (email_key) values (key);
  end if;
  delete from private.sign_in_leases l where l.email_key = key and l.token = sign_in_end.token;
end;
$$;
revoke all on function public.sign_in_end(text, uuid, boolean) from public;
grant execute on function public.sign_in_end(text, uuid, boolean) to anon, authenticated;

-- Passing the second factor clears the caller's failures (as in migration
-- 14, now on the renamed table). Only at aal2.
create or replace function public.sign_in_succeeded()
returns void
language sql volatile security definer
set search_path = ''
as $$
  delete from private.sign_in_failures
  where coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and auth.jwt() ->> 'email' is not null
    and email_key = private.sign_in_key(auth.jwt() ->> 'email')
$$;

-- The operator's and the test suite's clear (migration 15): failures and
-- any lease. Service role only, as before.
create or replace function public.reset_sign_in_attempts(email text)
returns integer
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  key bytea := private.sign_in_key(email);
  cleared integer;
begin
  delete from private.sign_in_leases l where l.email_key = key;
  delete from private.sign_in_failures f where f.email_key = key;
  get diagnostics cleared = row_count;
  return cleared;
end;
$$;
revoke all on function public.reset_sign_in_attempts(text) from public, anon, authenticated;
grant execute on function public.reset_sign_in_attempts(text) to service_role;

create or replace function private.purge_sign_in_attempts()
returns void
language sql security definer
set search_path = ''
as $$
  delete from private.sign_in_failures where occurred_at < now() - interval '24 hours';
  delete from private.sign_in_leases where held_until < now() - interval '1 hour';
$$;
