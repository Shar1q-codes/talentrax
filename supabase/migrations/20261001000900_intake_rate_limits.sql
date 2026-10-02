-- =============================================================================
-- 9. RATE LIMITS ON THE THREE PUBLIC FORMS
--
-- anon inserts straight into resume_submissions, contact_messages and leads
-- (migration 5). This migration bounds that, in the database, because that
-- is the one place every path to those tables passes through.
--
-- WHAT IS COUNTED: distinct submissions. A retry is not a submission:
--   * a row carrying a submission_key the form already sent, or
--   * a row identical in content to one accepted in the last 24 hours
-- is accepted silently - success to the caller, no second row, and nothing
-- counted. So a candidate whose connection dropped after they pressed
-- submit, and who presses it again, is never penalised, even when their
-- connection is already at its limit.
--
-- MEASURED ON, per form (thresholds in public.intake_limits):
--   ip      the client address, from cf-connecting-ip only - the header the
--           edge in front of hosted Supabase sets and a client cannot
--           forge there. An IPv6 address counts as its /64, which one
--           device can rotate through. No header, no per-IP limit: the
--           other headers are either the gateway's own address or the
--           client's claim. Exceeding it: HTTP 429 with Retry-After.
--   email   the address on the form. Exceeding it does NOT reject: the row
--           is accepted with held_at set, for staff to review. A 429 here
--           would tell anyone who typed in a stranger's address whether
--           that person had used the form today - on a resume form, that
--           someone is looking for work.
--   global  every submission to the form, from anywhere. The ceiling on a
--           flood from many addresses. Exceeding it: HTTP 429.
--
-- Neither address is stored. The ledger holds HMACs under a key only the
-- migration role can read, and forgets them after 48 hours.
--
-- Staff, and the trusted backend, are not limited.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The thresholds. Engineering defaults, not client facts: CLIENT-CONFIRM.md
-- item 25. A super_admin changes them; nothing in code repeats them.
-- -----------------------------------------------------------------------------
create table public.intake_limits (
  id uuid primary key default gen_random_uuid(),
  form text not null check (form in ('resume_submissions', 'contact_messages', 'leads')),
  scope text not null check (scope in ('ip', 'email', 'global')),
  window_length interval not null check (window_length > interval '0'),
  max_submissions integer not null check (max_submissions > 0),
  -- reject: HTTP 429. hold: accept, set held_at. Email is always hold.
  action text not null check (action in ('reject', 'hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  constraint intake_limits_one_per_scope unique (form, scope),
  constraint intake_limits_email_never_rejects check (scope <> 'email' or action = 'hold')
);
create index intake_limits_created_by_idx on public.intake_limits (created_by);
call private.attach_standard_triggers('public.intake_limits');

insert into public.intake_limits (form, scope, window_length, max_submissions, action) values
  -- Generous per address: hospital networks, offices and mobile carriers put
  -- many real people behind one IPv4 address.
  ('resume_submissions', 'ip', interval '1 hour', 20, 'reject'),
  ('contact_messages', 'ip', interval '1 hour', 20, 'reject'),
  ('leads', 'ip', interval '1 hour', 20, 'reject'),
  -- A person rarely sends more than a few distinct resumes, or messages, a day.
  ('resume_submissions', 'email', interval '24 hours', 3, 'hold'),
  ('contact_messages', 'email', interval '24 hours', 5, 'hold'),
  ('leads', 'email', interval '24 hours', 5, 'hold'),
  -- One every twelve seconds, sustained for an hour, per form.
  ('resume_submissions', 'global', interval '1 hour', 300, 'reject'),
  ('contact_messages', 'global', interval '1 hour', 300, 'reject'),
  ('leads', 'global', interval '1 hour', 300, 'reject');

alter table public.intake_limits enable row level security;
create policy intake_limits_select on public.intake_limits
  for select to authenticated using ((select private.is_admin()));
create policy intake_limits_update on public.intake_limits
  for update to authenticated
  using ((select private.has_role('super_admin')))
  with check ((select private.has_role('super_admin')));

insert into private.column_classification (table_name, column_name, personal) values
  ('intake_limits', 'form', false),
  ('intake_limits', 'scope', false),
  ('intake_limits', 'action', false);

-- -----------------------------------------------------------------------------
-- The ledger, and the key it is hashed under.
-- -----------------------------------------------------------------------------
create table private.intake_settings (
  singleton boolean primary key default true check (singleton),
  hmac_key bytea not null default extensions.gen_random_bytes(32)
);
insert into private.intake_settings default values;
revoke all on private.intake_settings from public, anon, authenticated, service_role;

create table private.intake_events (
  id bigint generated always as identity primary key,
  form text not null,
  ip_key bytea,
  email_key bytea,
  fingerprint bytea not null,
  submission_key uuid,
  occurred_at timestamptz not null default now()
);
create index intake_events_ip_idx on private.intake_events (form, ip_key, occurred_at) where ip_key is not null;
create index intake_events_email_idx on private.intake_events (form, email_key, occurred_at) where email_key is not null;
create index intake_events_fingerprint_idx on private.intake_events (form, fingerprint, occurred_at);
create index intake_events_submission_key_idx on private.intake_events (form, submission_key) where submission_key is not null;
create index intake_events_form_idx on private.intake_events (form, occurred_at);
revoke all on private.intake_events from public, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- The form-facing columns. submission_key is generated by the form once per
-- submission and resent on every retry. held_at is ours.
-- -----------------------------------------------------------------------------
alter table public.resume_submissions add column submission_key uuid, add column held_at timestamptz;
alter table public.contact_messages add column submission_key uuid, add column held_at timestamptz;
alter table public.leads add column submission_key uuid, add column held_at timestamptz;
create unique index resume_submissions_submission_key_key on public.resume_submissions (submission_key) where submission_key is not null;
create unique index contact_messages_submission_key_key on public.contact_messages (submission_key) where submission_key is not null;
create unique index leads_submission_key_key on public.leads (submission_key) where submission_key is not null;
grant insert (submission_key) on public.resume_submissions, public.contact_messages, public.leads to anon;

-- -----------------------------------------------------------------------------
-- The limiter.
-- -----------------------------------------------------------------------------

-- The client address the limit is keyed on, or NULL. cf-connecting-ip only.
create function private.intake_client_key(hmac_key bytea)
returns bytea
language plpgsql stable
set search_path = ''
as $$
declare
  raw text := btrim(coalesce(private.request_header('cf-connecting-ip'), ''));
  addr inet;
begin
  if raw = '' then
    return null;
  end if;
  begin
    addr := raw::inet;
  exception when others then
    return null;
  end;
  if family(addr) = 6 then
    addr := network(set_masklen(addr, 64));
  end if;
  return extensions.hmac(convert_to(host(addr) || '/' || masklen(addr), 'UTF8'), hmac_key, 'sha256');
end;
$$;

-- Seconds until the oldest counted submission leaves the window.
create function private.intake_retry_after(form_name text, scope text, key bytea, window_length interval)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select greatest(1, ceil(extract(epoch from (min(e.occurred_at) + window_length - now())))::integer)
  from private.intake_events e
  where e.form = form_name
    and e.occurred_at > now() - window_length
    and (scope = 'global'
         or (scope = 'ip' and e.ip_key = key)
         or (scope = 'email' and e.email_key = key))
$$;

create function private.reject_intake(retry_after integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- PostgREST turns SQLSTATE PGRST into the status and headers in DETAIL.
  -- The message is the same for every limit: it says nothing about why.
  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'rate_limited',
      'message', 'Too many submissions. Please wait and try again.',
      'details', null,
      'hint', null)::text,
    detail = json_build_object(
      'status', 429,
      'headers', json_build_object('Retry-After', retry_after::text))::text;
end;
$$;

create function private.limit_intake()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  form_name text := tg_table_name;
  v_hmac_key bytea;
  v_ip_key bytea;
  v_email_key bytea;
  fp bytea;
  raw_email text;
  lim record;
  counted integer;
  held boolean := false;
begin
  -- Staff and the trusted backend are not limited.
  if not private.is_end_user_request() or private.is_staff() then
    return new;
  end if;

  select s.hmac_key into v_hmac_key from private.intake_settings s;
  -- Through jsonb: PL/pgSQL resolves new.<column> even in a CASE branch not
  -- taken, and leads has contact_email where the other two have email.
  raw_email := to_jsonb(new) ->> case form_name when 'leads' then 'contact_email' else 'email' end;
  if raw_email is not null then
    v_email_key := extensions.hmac(convert_to(public.normalize_email(raw_email), 'UTF8'), v_hmac_key, 'sha256');
  end if;
  v_ip_key := private.intake_client_key(v_hmac_key);
  -- What was submitted, without the columns that differ between two sends
  -- of the same thing.
  fp := extensions.hmac(
    convert_to(form_name || (to_jsonb(new) - array[
      'id', 'created_at', 'updated_at', 'created_by', 'deleted_at',
      'consent_recorded_at', 'submission_key', 'held_at'])::text, 'UTF8'),
    v_hmac_key, 'sha256');

  -- 1. A retry is accepted silently, before any limit, and counts for nothing.
  --    The lock makes two simultaneous sends of the same thing take turns.
  perform pg_advisory_xact_lock(hashtextextended(form_name || encode(fp, 'hex'), 0));
  if new.submission_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(form_name || new.submission_key::text, 0));
    if exists (select 1 from private.intake_events e
               where e.form = form_name and e.submission_key = new.submission_key) then
      return null;
    end if;
  end if;
  if exists (select 1 from private.intake_events e
             where e.form = form_name and e.fingerprint = fp
               and e.occurred_at > now() - interval '24 hours') then
    return null;
  end if;

  -- 2. The limits.
  if v_ip_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(form_name || encode(v_ip_key, 'hex'), 0));
  end if;
  for lim in
    select l.* from public.intake_limits l
    where l.form = form_name
    order by case l.scope when 'global' then 1 when 'ip' then 2 else 3 end
  loop
    continue when lim.scope = 'ip' and v_ip_key is null;
    continue when lim.scope = 'email' and v_email_key is null;
    select count(*) into counted
    from private.intake_events e
    where e.form = form_name
      and e.occurred_at > now() - lim.window_length
      and (lim.scope = 'global'
           or (lim.scope = 'ip' and e.ip_key = v_ip_key)
           or (lim.scope = 'email' and e.email_key = v_email_key));
    if counted >= lim.max_submissions then
      if lim.action = 'reject' then
        perform private.reject_intake(private.intake_retry_after(
          form_name, lim.scope,
          case lim.scope when 'ip' then v_ip_key when 'email' then v_email_key end,
          lim.window_length));
      else
        held := true;
      end if;
    end if;
  end loop;

  -- 3. Accepted: record it, and say whether it was held.
  insert into private.intake_events (form, ip_key, email_key, fingerprint, submission_key)
  values (form_name, v_ip_key, v_email_key, fp, new.submission_key);
  new.held_at := case when held then now() end;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['resume_submissions', 'contact_messages', 'leads'] loop
    execute format(
      'create trigger limit_intake before insert on public.%I
         for each row execute function private.limit_intake()', t);
  end loop;
end;
$$;

revoke all on function
  private.intake_client_key(bytea), private.intake_retry_after(text, text, bytea, interval),
  private.reject_intake(integer)
from public, anon, authenticated, service_role;
revoke all on function private.limit_intake() from public;
grant execute on function private.limit_intake() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- The ledger forgets after 48 hours: twice the longest window.
-- -----------------------------------------------------------------------------
create function private.purge_intake_events()
returns void
language sql security definer
set search_path = ''
as $$
  delete from private.intake_events where occurred_at < now() - interval '48 hours'
$$;
revoke all on function private.purge_intake_events() from public, anon, authenticated, service_role;
select cron.schedule('purge-intake-events', '23 * * * *', $$select private.purge_intake_events()$$);
