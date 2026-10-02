-- Rolls back 20261001001300_intake_trap_repeat_held.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- The limiter forgets trap_tripped, and the column goes.

create or replace function private.limit_intake()
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

alter table public.resume_submissions drop column trap_tripped;
alter table public.contact_messages drop column trap_tripped;
alter table public.leads drop column trap_tripped;
