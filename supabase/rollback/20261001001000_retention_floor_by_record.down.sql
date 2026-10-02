-- Rolls back 20261001001000_retention_floor_by_record.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Restores migration 6's floor: every candidate row dated, one period for
-- every record. Open deferrals keep the dates the newer floor gave them
-- until the worker next considers them.

drop trigger redate_deferrals on public.retention_rules;
drop function private.redate_deferrals();

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
    select id from public.deletion_requests
    where status in ('scheduled', 'deferred')
      and execute_after <= now()
      and (status = 'scheduled'
           or partially_executed_at is null
           or deferred_until is null
           or deferred_until <= now())
    order by execute_after
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


create or replace function private.erase_unretained(req public.deletion_requests)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.candidate_embeddings where candidate_id = req.candidate_id;
  get diagnostics n = row_count;
  return jsonb_build_object('candidate_embeddings', n);
end;
$$;


create or replace function private.retention_floor(target uuid, out retain_until timestamptz, out basis text[])
language plpgsql stable security definer
set search_path = ''
as $$
declare
  latest timestamptz;
  longest interval;
begin
  with cand as (
    select c.* from public.candidates c where c.id = target
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
  dates(d) as (
    select greatest(created_at, updated_at) from cand
    union all select greatest(created_at, updated_at) from intake
    union all select greatest(created_at, updated_at) from apps
    union all select greatest(created_at, updated_at, sent_to_employer_at, employer_response_at) from subs
    union all select e.occurred_at from public.submission_events e join subs on subs.id = e.submission_id
    union all select greatest(i.created_at, i.updated_at, i.scheduled_at) from public.interviews i join subs on subs.id = i.submission_id
    union all select greatest(o.created_at, o.updated_at, o.responded_at) from public.offers o join subs on subs.id = o.submission_id
    union all select greatest(p.created_at, p.updated_at, p.end_date::timestamptz) from public.placements p where p.candidate_id = target
    union all select greatest(d.created_at, d.updated_at) from public.candidate_documents d where d.candidate_id = target
    union all select greatest(t.created_at, t.updated_at) from public.candidate_engagement_types t where t.candidate_id = target
    union all select greatest(m.created_at, m.updated_at) from public.message_log m where m.candidate_id = target
  ),
  places(state) as (
    select state from cand
    union select state from intake
    union select j.state from apps join public.jobs j on j.id = apps.job_id
    union select r.state from subs join public.requisitions r on r.id = subs.requisition_id
  ),
  rules as (
    select rr.code, rr.retention_period from public.retention_rules rr
    where rr.is_active
      and (rr.state is null or rr.state in (select state from places where state is not null))
  )
  select (select max(d) from dates),
         (select max(retention_period) from rules),
         (select coalesce(array_agg(code order by code), '{}') from rules)
    into latest, longest, basis;

  if longest is null or latest is null then
    retain_until := null;
    basis := '{}';
  else
    retain_until := latest + longest;
  end if;
end;
$$;


delete from private.column_classification
 where table_name = 'retention_rules' and column_name = 'record_kinds';
alter table public.retention_rules
  drop constraint retention_rules_record_kinds_known,
  drop column record_kinds;
