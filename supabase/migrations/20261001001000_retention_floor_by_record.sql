-- =============================================================================
-- 10. THE RETENTION FLOOR, COMPUTED FROM THE RECORDS EACH RULE COVERS
--
-- Migration 6 computed one floor per candidate: the latest change to ANY of
-- their rows, the candidate row itself included, plus the longest active rule.
-- Two nationwide rules are always active and the candidate row always exists,
-- so every candidate had a floor, whatever they had on file:
--
--   - a candidate with no application, resume or referral was deferred a
--     year from their last edit, for nothing. `scheduled` was reachable only
--     by a file nobody had touched for a year;
--   - a recruiter fixing a typo, or a message being logged, pushed the floor
--     out again;
--   - each rule's period applied to every record, so California's four
--     years, which cover applications and referral records, held everything.
--
-- Now each rule names the kinds of record it covers (retention_rules
-- .record_kinds, data, edited like the period), and is computed against
-- records of those kinds only. A rule with nothing of its kinds on file
-- contributes nothing. The floor is the latest of the per-rule results.
--
-- RECORD KINDS, and the tables that are each:
--
--   application        applications; candidate_documents other than
--                      resumes (cover letters, certifications, other
--                      application material)
--   resume             resume_submissions (the resume form - the application
--                      as submitted); candidate_documents of kind 'resume'
--   referral           submissions; submission_events
--   personnel_action   interviews; offers
--   placement          placements
--
-- NOT RECORDS. The candidate row, message_log and candidate_engagement_types
-- no longer date the floor. The candidate row stays while a request is
-- deferred (everything above references it), but its own timestamps do not
-- extend anything. message_log and candidate_engagement_types are no longer
-- covered by any rule, so 11 CCR 7022(f)(2) - delete what the exception does
-- not cover - reaches them while a request is deferred: they are now erased
-- at the first step, with the embeddings.
--
-- Job orders (ADEA) are requisitions: the employer's record, not the
-- candidate's. Keeping one does not require keeping the candidate.
--
-- THE STORED DATE IS NOT THE GATE. deletion_requests.deferred_until is what
-- the candidate is shown; the floor is recomputed from live records whenever
-- a request is considered. So:
--   - the worker now also takes a deferred request whose live floor has
--     passed, even if its stored date has not - its qualifying records may
--     be gone;
--   - changing a retention rule (a period, its kinds, or switching one on)
--     re-dates every open deferral at once, so OFCCP coming on moves every
--     affected date to two years without a migration.
--
-- What the change means per table is in supabase/ERASURE.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Which records each rule covers.
-- -----------------------------------------------------------------------------
alter table public.retention_rules
  add column record_kinds text[] not null default '{}';

update public.retention_rules set record_kinds = case code
  -- 29 CFR 1627.4(a): placements, referrals, job orders, applications, resumes.
  when 'adea-employment-agency'
    then array['application', 'resume', 'referral', 'placement']
  -- 29 CFR 1602.14: application forms and "other records having to do with
  -- hiring", and the personnel action itself.
  when 'title-vii-ada-gina'
    then array['application', 'resume', 'referral', 'personnel_action', 'placement']
  -- Gov. Code 12946: applications and employment referral records. A resume
  -- sent through the form is the application as submitted.
  when 'ca-feha'
    then array['application', 'resume', 'referral']
  -- 41 CFR 60-1.12(a): records having to do with hiring, applications,
  -- resumes, internet expressions of interest, interview notes.
  when 'ofccp-federal-contractor'
    then array['application', 'resume', 'referral', 'personnel_action', 'placement']
end;

alter table public.retention_rules
  alter column record_kinds drop default,
  add constraint retention_rules_record_kinds_known check (
    cardinality(record_kinds) > 0
    and record_kinds <@ array['application', 'resume', 'referral', 'personnel_action', 'placement']
  );

insert into private.column_classification (table_name, column_name, personal)
values ('retention_rules', 'record_kinds', false);

-- -----------------------------------------------------------------------------
-- B. The floor.
--
-- retain_until  the latest of (latest record of the rule's kinds + period),
--               over the active rules that apply; NULL when no rule has a
--               record to cover.
-- basis         the codes of the rules still holding something today: what
--               the candidate is told is keeping their records. A rule whose
--               own floor has passed is not named.
-- -----------------------------------------------------------------------------
create or replace function private.retention_floor(target uuid, out retain_until timestamptz, out basis text[])
language plpgsql stable security definer
set search_path = ''
as $$
begin
  with cand as (
    select c.state, c.email_normalized from public.candidates c where c.id = target
  ),
  subs as (
    select s.* from public.submissions s where s.candidate_id = target
  ),
  apps as (
    select a.* from public.applications a where a.candidate_id = target
  ),
  intake as (
    select rs.* from public.resume_submissions rs
    where rs.candidate_id = target
       or (rs.email_normalized is not null
           and rs.email_normalized = (select email_normalized from cand))
  ),
  records(kind, d) as (
    select 'application', greatest(created_at, updated_at) from apps
    union all select 'application', greatest(d.created_at, d.updated_at)
      from public.candidate_documents d where d.candidate_id = target and d.kind <> 'resume'
    union all select 'resume', greatest(created_at, updated_at) from intake
    union all select 'resume', greatest(d.created_at, d.updated_at)
      from public.candidate_documents d where d.candidate_id = target and d.kind = 'resume'
    union all select 'referral', greatest(created_at, updated_at, sent_to_employer_at, employer_response_at) from subs
    union all select 'referral', e.occurred_at from public.submission_events e join subs on subs.id = e.submission_id
    union all select 'personnel_action', greatest(i.created_at, i.updated_at, i.scheduled_at)
      from public.interviews i join subs on subs.id = i.submission_id
    union all select 'personnel_action', greatest(o.created_at, o.updated_at, o.responded_at)
      from public.offers o join subs on subs.id = o.submission_id
    union all select 'placement', greatest(p.created_at, p.updated_at, p.end_date::timestamptz)
      from public.placements p where p.candidate_id = target
  ),
  -- Where the candidate is linked to: which state-scoped rules apply. This
  -- is location, not a dated record, so the candidate row still counts here.
  places(state) as (
    select state from cand
    union select state from intake
    union select j.state from apps join public.jobs j on j.id = apps.job_id
    union select r.state from subs join public.requisitions r on r.id = subs.requisition_id
  ),
  per_rule as (
    select rr.code,
           (select max(rec.d) from records rec where rec.kind = any (rr.record_kinds))
             + rr.retention_period as until
    from public.retention_rules rr
    where rr.is_active
      and (rr.state is null or rr.state in (select state from places where state is not null))
  )
  select max(until),
         coalesce(array_agg(code order by code) filter (where until > now()), '{}')
    into retain_until, basis
  from per_rule;
end;
$$;

-- -----------------------------------------------------------------------------
-- C. The first step of a deferred request: what no rule covers. Embeddings,
-- as before, and now the message log and engagement preferences, which no
-- rule names. 11 CCR 7022(f)(2).
-- -----------------------------------------------------------------------------
create or replace function private.erase_unretained(req public.deletion_requests)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  summary jsonb := '{}';
  n integer;
begin
  delete from public.candidate_embeddings where candidate_id = req.candidate_id;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('candidate_embeddings', n);

  delete from public.message_log where candidate_id = req.candidate_id;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('message_log', n);

  delete from public.candidate_engagement_types where candidate_id = req.candidate_id;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('candidate_engagement_types', n);

  return summary;
end;
$$;

-- -----------------------------------------------------------------------------
-- D. The worker takes a deferred request whose LIVE floor has passed, not
-- only one whose stored date has. Same body as migration 6 plus the last
-- condition.
-- -----------------------------------------------------------------------------
create or replace function public.process_due_deletion_requests(p_limit integer default 25)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
  advanced integer := 0;
  failed_state text;
begin
  for r in
    select dr.id from public.deletion_requests dr
    where dr.status in ('scheduled', 'deferred')
      and dr.execute_after <= now()
      and (dr.status = 'scheduled'
           or dr.partially_executed_at is null
           or dr.deferred_until is null
           or dr.deferred_until <= now()
           or coalesce((select f.retain_until from private.retention_floor(dr.candidate_id) f),
                       '-infinity') <= now())
    order by dr.execute_after
    limit p_limit
    for update skip locked
  loop
    begin
      perform private.advance_deletion_request(r.id);
      advanced := advanced + 1;
    exception when others then
      get stacked diagnostics failed_state = returned_sqlstate;
      update public.deletion_requests
         set attempts = attempts + 1, last_error_state = failed_state, last_error_at = now()
       where id = r.id;
    end;
  end loop;
  return advanced;
end;
$$;

-- -----------------------------------------------------------------------------
-- E. A change to the rules re-dates every open deferral.
--
-- A request under a legal hold is left alone: the hold, not a date, is what
-- defers it. A deferral whose floor is now gone or passed is dated now, so
-- the next run takes it.
-- -----------------------------------------------------------------------------
create function private.redate_deferrals()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.deletion_requests dr
     set deferred_until = coalesce(f.retain_until, now()),
         deferral_basis = f.basis
    from public.deletion_requests src
    cross join lateral private.retention_floor(src.candidate_id) f
   where dr.id = src.id
     and src.status = 'deferred'
     and not private.has_active_hold(src.candidate_id)
     and (dr.deferred_until is distinct from coalesce(f.retain_until, now())
          or dr.deferral_basis is distinct from f.basis);
  return null;
end;
$$;

create trigger redate_deferrals
  after insert or update or delete on public.retention_rules
  for each statement execute function private.redate_deferrals();

revoke execute on function private.redate_deferrals() from public, anon, authenticated, service_role;
