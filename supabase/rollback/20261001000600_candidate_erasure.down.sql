-- Rolls back 20261001000600_candidate_erasure.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Fails on purpose if any candidate has been erased: their full_name is NULL
-- and cannot go back under NOT NULL. Erasure is not reversible, and a
-- rollback must not pretend otherwise.

select cron.unschedule('process-deletion-requests');
drop extension if exists pg_cron;

drop function if exists
  public.fail_storage_erasure(uuid, text),
  public.complete_storage_erasure(uuid),
  public.claim_storage_erasures(integer),
  public.process_due_deletion_requests(integer),
  public.release_legal_hold(uuid),
  public.place_legal_hold(uuid, text, text),
  public.cancel_deletion_request(uuid),
  public.refuse_deletion_request(uuid, text),
  public.accept_deletion_request(uuid, text, timestamptz),
  public.record_deletion_request(uuid, text),
  public.request_my_deletion(),
  private.advance_deletion_request(uuid),
  private.erase_candidate(public.deletion_requests),
  private.erase_unretained(public.deletion_requests);

do $$
declare
  t text;
begin
  foreach t in array array[
    'applications', 'submissions', 'interviews', 'offers', 'candidate_documents',
    'candidate_embeddings', 'candidate_engagement_types', 'message_log', 'communication_consents'
  ] loop
    execute format('drop trigger if exists refuse_if_restricted on public.%I', t);
  end loop;
end;
$$;

drop trigger submission_events_append_only on public.submission_events;
create trigger submission_events_append_only
  before update or delete on public.submission_events
  for each row execute function private.forbid_mutation();

-- The original bodies, from migrations 1, 3 and 5.
create or replace function private.audit_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  old_json jsonb;
  new_json jsonb;
  audit_action text := tg_op;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_json := to_jsonb(old) - 'embedding';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_json := to_jsonb(new) - 'embedding';
  end if;

  if tg_op = 'UPDATE' then
    if old_json ->> 'deleted_at' is null and new_json ->> 'deleted_at' is not null then
      audit_action := 'SOFT_DELETE';
    elsif old_json ->> 'deleted_at' is not null and new_json ->> 'deleted_at' is null then
      audit_action := 'RESTORE';
    end if;
  end if;

  insert into public.audit_log (
    actor_id, action, table_name, record_id, old_values, new_values,
    ip, user_agent, created_by
  ) values (
    auth.uid(),
    audit_action,
    tg_table_schema || '.' || tg_table_name,
    coalesce(new_json ->> 'id', old_json ->> 'id')::uuid,
    old_json,
    new_json,
    private.request_ip(),
    private.request_header('user-agent'),
    auth.uid()
  );
  return null;
end;
$$;

create or replace function private.submission_timeline()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.submission_events (submission_id, event_type, to_status, actor_id)
    values (new.id, 'created', new.status, actor);
  else
    if new.status is distinct from old.status then
      insert into public.submission_events (submission_id, event_type, from_status, to_status, actor_id)
      values (new.id, 'status_changed', old.status, new.status, actor);
    end if;
    if new.bdm_decision is distinct from old.bdm_decision then
      insert into public.submission_events (submission_id, event_type, from_status, to_status, actor_id, notes)
      values (new.id, 'bdm_decision', old.bdm_decision, new.bdm_decision, actor, new.bdm_notes);
    end if;
    if new.employer_response is distinct from old.employer_response then
      insert into public.submission_events (submission_id, event_type, actor_id, notes)
      values (new.id, 'employer_response', actor, new.employer_response);
    end if;
  end if;

  if new.candidate_consent_obtained
     and (tg_op = 'INSERT' or not old.candidate_consent_obtained) then
    insert into public.submission_events (submission_id, event_type, actor_id)
    values (new.id, 'consent_recorded', actor);
  end if;
  if new.sent_to_employer_at is not null
     and (tg_op = 'INSERT' or old.sent_to_employer_at is null) then
    insert into public.submission_events (submission_id, event_type, actor_id)
    values (new.id, 'sent_to_employer', actor);
  end if;
  return null;
end;
$$;

create or replace function private.can_manage_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or (
        private.has_role('recruiter', 'full_desk_recruiter')
        and (
          exists (
            select 1 from public.candidates c
            where c.id = target and c.owner_id = private.current_profile_id()
          )
          or exists (
            select 1 from public.submissions s
            where s.candidate_id = target
              and s.submitted_by = private.current_profile_id()
              and s.deleted_at is null
          )
          or exists (
            select 1 from public.applications a
            join public.jobs j on j.id = a.job_id
            where a.candidate_id = target
              and a.deleted_at is null
              and private.is_on_requisition(j.requisition_id)
          )
        )
      )
$$;

create or replace function private.staff_can_read_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.can_manage_candidate(target)
      or (
        private.has_role('bdm')
        and exists (
          select 1 from public.submissions s
          where s.candidate_id = target
            and s.deleted_at is null
            and (s.bdm_id = private.current_profile_id()
                 or private.can_manage_requisition(s.requisition_id))
        )
      )
$$;

create or replace function private.can_read_submission(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or exists (
        select 1 from public.submissions s
        where s.id = target
          and s.deleted_at is null
          and (
            (private.has_role('recruiter', 'full_desk_recruiter')
             and s.submitted_by = private.current_profile_id())
            or (private.has_role('bdm')
                and (s.bdm_id = private.current_profile_id()
                     or private.can_manage_requisition(s.requisition_id)))
          )
      )
$$;

drop function if exists
  private.guard_submission_event(),
  private.refuse_if_restricted(),
  private.retention_floor(uuid),
  private.has_active_hold(uuid),
  private.is_restricted_candidate(uuid),
  private.erasure_candidate();

drop table if exists
  public.storage_erasures,
  public.deletion_requests,
  public.legal_holds,
  public.retention_rules;

alter table public.candidates
  drop constraint candidates_erased_holds_no_personal_data,
  drop constraint candidates_full_name_present;
alter table public.candidates alter column full_name set not null;
alter table public.candidates drop column erased_at;

drop table private.column_classification;
