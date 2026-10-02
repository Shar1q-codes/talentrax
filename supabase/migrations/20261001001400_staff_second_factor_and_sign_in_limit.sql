-- =============================================================================
-- 14. STAFF NEED THE SECOND FACTOR, AND SIGN-IN ATTEMPTS ARE LIMITED
--
-- Build step 6: staff sign-in, with TOTP required. Two things the database
-- must enforce itself, because the page is not the only way in.
--
-- A. A STAFF ROLE COUNTS ONLY AT AAL2.
--    Every policy, view and trigger reads the caller's role through
--    private.current_role(). It now returns a staff role only when the
--    session's JWT says the second factor was passed (aal = 'aal2'). A staff
--    member who has typed only their password holds an aal1 token, and
--    with it reads exactly what a signed-in nobody reads: their own profile
--    row (profiles_select_self keys on the profile id, not the role), and
--    nothing else. So a stolen password used straight against the API, past
--    the page, gets nothing either.
--    employer_user and job_seeker are unaffected: they have no second
--    factor, and their access is already confined to their own records.
--    Service role, migrations and psql have no auth.uid() and are unaffected.
--
-- B. A LIMIT ON SIGN-IN ATTEMPTS, PER EMAIL ADDRESS.
--    Staff sign in through our server, so Supabase Auth sees our server's
--    address for every attempt, and its per-address limit cannot tell one
--    attacker from all staff. This counts attempts per email address
--    instead: password attempts and second-factor codes alike. Past the
--    limit, an attempt is refused before it reaches Auth, with the same
--    answer as a wrong password.
--      * The address is never stored: an HMAC under the intake key
--        (migration 9), forgotten after a day.
--      * Any string is counted the same, an account or not, so the limit
--        says nothing about which addresses have accounts.
--      * Reaching the second factor clears the count for that address.
--      * Trade-off, accepted: anyone can spend an address's attempts and
--        lock it out until the window passes. That is true of every
--        per-account limit; the alternative is no limit.
--    Thresholds live in private.sign_in_settings, changed by SQL, never in
--    code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. The role, at aal2 for staff.
-- -----------------------------------------------------------------------------
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
    and (p.role in ('employer_user', 'job_seeker')
         or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
$$;

-- -----------------------------------------------------------------------------
-- B. The sign-in limit.
-- -----------------------------------------------------------------------------
create table private.sign_in_settings (
  singleton boolean primary key default true check (singleton),
  max_attempts integer not null check (max_attempts > 0),
  window_length interval not null check (window_length > interval '0')
);
-- Five tries in fifteen minutes: a password and a code take two, so a typo
-- or two still gets a person in.
insert into private.sign_in_settings (max_attempts, window_length) values (5, interval '15 minutes');
revoke all on private.sign_in_settings from public, anon, authenticated, service_role;

create table private.sign_in_attempts (
  id bigint generated always as identity primary key,
  email_key bytea not null,
  occurred_at timestamptz not null default now()
);
create index sign_in_attempts_key_idx on private.sign_in_attempts (email_key, occurred_at);
revoke all on private.sign_in_attempts from public, anon, authenticated, service_role;

create function private.sign_in_key(email text)
returns bytea
language sql stable security definer
set search_path = ''
as $$
  select extensions.hmac(
    convert_to('sign-in:' || public.normalize_email(email), 'UTF8'),
    (select s.hmac_key from private.intake_settings s), 'sha256')
$$;
revoke all on function private.sign_in_key(text) from public, anon, authenticated, service_role;

-- Called before every password attempt and every second-factor code. TRUE:
-- go ahead, and the attempt is counted. FALSE: refuse it, as if it failed;
-- nothing is counted.
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

-- Called once the second factor is passed. Clears the caller's own count,
-- and only at aal2: a password alone does not reset the limit.
create function public.sign_in_succeeded()
returns void
language sql volatile security definer
set search_path = ''
as $$
  delete from private.sign_in_attempts
  where coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and auth.jwt() ->> 'email' is not null
    and email_key = private.sign_in_key(auth.jwt() ->> 'email')
$$;
revoke all on function public.sign_in_succeeded() from public, anon;
grant execute on function public.sign_in_succeeded() to authenticated;

create function private.purge_sign_in_attempts()
returns void
language sql security definer
set search_path = ''
as $$
  delete from private.sign_in_attempts where occurred_at < now() - interval '24 hours'
$$;
revoke all on function private.purge_sign_in_attempts() from public, anon, authenticated, service_role;
select cron.schedule('purge-sign-in-attempts', '37 * * * *', $$select private.purge_sign_in_attempts()$$);
