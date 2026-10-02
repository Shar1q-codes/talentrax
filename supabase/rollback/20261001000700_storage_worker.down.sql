-- Rolls back 20261001000700_storage_worker.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Fails on purpose if the outbox holds any row: the reshaped columns cannot
-- go back without losing which bucket an object is in.

do $$
begin
  if exists (select 1 from public.storage_erasures) then
    raise exception 'storage_erasures is not empty; refusing to roll back';
  end if;
end;
$$;

select cron.unschedule('invoke-storage-worker');
select cron.unschedule('check-storage-erasures');
drop function private.invoke_storage_worker();
drop extension if exists pg_net;

drop function
  private.assert_storage_erasures_healthy(),
  public.storage_erasure_backlog(),
  public.fail_storage_erasure(uuid, uuid, text),
  public.complete_storage_erasure(uuid, uuid),
  public.claim_storage_erasures(integer, interval),
  private.storage_erasure_failed(uuid, text);

drop index public.storage_erasures_one_pending_idx;
drop index public.storage_erasures_due_idx;
alter table public.storage_erasures
  drop constraint storage_erasures_done_is_cleared,
  drop constraint storage_erasures_reason_has_request,
  drop column reason,
  drop column bucket,
  drop column outcome,
  drop column present_at_claim,
  drop column claim_token,
  drop column next_attempt_at,
  drop column needs_attention_at,
  add column source_table text not null check (source_table in ('candidate_documents', 'resume_submissions')),
  alter column deletion_request_id set not null,
  add constraint storage_erasures_done_is_cleared check (
    (status = 'done') = (completed_at is not null)
    and (status = 'pending') = (object_path is not null)
  );
create index storage_erasures_pending_idx on public.storage_erasures (created_at) where status = 'pending';

delete from private.column_classification
 where table_name = 'storage_erasures' and column_name in ('reason', 'bucket', 'outcome');
insert into private.column_classification (table_name, column_name, personal)
values ('storage_erasures', 'source_table', false);

-- The original bodies, from migration 6.
create or replace function private.erase_candidate(req public.deletion_requests)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  c uuid := req.candidate_id;
  cand public.candidates;
  account public.profiles;
  summary jsonb := '{}';
  n integer;
  n_originals integer;
  app_ids uuid[];
  sub_ids uuid[];
  interview_ids uuid[];
  offer_ids uuid[];
  placement_ids uuid[];
  intake_ids uuid[];
begin
  select * into cand from public.candidates where id = c for update;
  if cand.erased_at is not null then
    return jsonb_build_object('already_erased', true);
  end if;

  select coalesce(array_agg(id), '{}') into app_ids from public.applications where candidate_id = c;
  select coalesce(array_agg(id), '{}') into sub_ids from public.submissions where candidate_id = c;
  select coalesce(array_agg(id), '{}') into interview_ids from public.interviews where submission_id = any (sub_ids);
  select coalesce(array_agg(id), '{}') into offer_ids from public.offers where submission_id = any (sub_ids);
  select coalesce(array_agg(id), '{}') into placement_ids from public.placements where candidate_id = c;
  select coalesce(array_agg(id), '{}') into intake_ids from public.resume_submissions
   where candidate_id = c
      or (email_normalized is not null and email_normalized = cand.email_normalized);

  -- The bytes, queued in this transaction (see storage_erasures).
  insert into public.storage_erasures (deletion_request_id, source_table, object_path)
  select req.id, 'candidate_documents', d.storage_path
  from public.candidate_documents d where d.candidate_id = c
  union all
  select req.id, 'resume_submissions', rs.resume_storage_path
  from public.resume_submissions rs
  where rs.id = any (intake_ids) and rs.resume_storage_path is not null;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('storage_objects_queued', n);

  -- Erased: rows that exist only because of the candidate.
  delete from public.candidate_embeddings where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('candidate_embeddings', n);

  delete from public.activities
  where (subject_type = 'candidate' and subject_id = c)
     or (subject_type = 'application' and subject_id = any (app_ids))
     or (subject_type = 'submission' and subject_id = any (sub_ids))
     or (subject_type = 'interview' and subject_id = any (interview_ids))
     or (subject_type = 'offer' and subject_id = any (offer_ids))
     or (subject_type = 'placement' and subject_id = any (placement_ids));
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('activities', n);

  delete from public.message_log where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('message_log', n);

  delete from public.communication_consents where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('communication_consents', n);

  delete from public.candidate_engagement_types where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('candidate_engagement_types', n);

  delete from public.resume_submissions where id = any (intake_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('resume_submissions', n);

  -- Anonymised in place: the employer's transaction with Talentrax.
  -- Detach what is about to be deleted, and clear the free text about the
  -- person. Consent flags, dates, rate and status stay: they are the
  -- evidence that the gate held.
  update public.submissions
     set bdm_notes = null,
         employer_response = null,
         shared_document_id = null,
         application_id = null
   where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('submissions_anonymised', n);

  update public.submission_events
     set notes = null
   where submission_id = any (sub_ids) and notes is not null;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('submission_events_anonymised', n);

  update public.interviews
     set location_or_link = null, outcome = null, feedback = null
   where id = any (interview_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('interviews_anonymised', n);

  update public.offers set decline_reason = null where id = any (offer_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('offers_anonymised', n);

  -- Placements are left alone: no column of theirs identifies the person.
  summary := summary || jsonb_build_object('placements_kept', cardinality(placement_ids));

  -- Erased, now that nothing references them.
  delete from public.applications where id = any (app_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('applications', n);

  -- Scrubbed versions first: they reference their original.
  delete from public.candidate_documents where candidate_id = c and not is_original;
  get diagnostics n = row_count;
  delete from public.candidate_documents where candidate_id = c;
  get diagnostics n_originals = row_count;
  summary := summary || jsonb_build_object('candidate_documents', n + n_originals);

  -- The account, if the candidate registered one. Staff accounts are never
  -- touched by a candidate erasure.
  if cand.profile_id is not null then
    select * into account from public.profiles where id = cand.profile_id for update;
    if account.role = 'job_seeker' then
      update public.profiles
         set full_name = null, email = null, is_active = false, deleted_at = now()
       where id = account.id;
      update auth.users
         set email = null, phone = null, encrypted_password = '',
             raw_user_meta_data = '{}', raw_app_meta_data = '{}',
             email_change = '', phone_change = '', confirmation_token = '',
             recovery_token = '', email_change_token_new = '',
             email_change_token_current = '', phone_change_token = '',
             reauthentication_token = '', banned_until = 'infinity', deleted_at = now()
       where id = account.id;
      delete from auth.identities where user_id = account.id;
      delete from auth.sessions where user_id = account.id;
      delete from auth.refresh_tokens where user_id = account.id::text;
      delete from auth.mfa_factors where user_id = account.id;
      delete from auth.one_time_tokens where user_id = account.id;
      -- GoTrue's own audit trail stores the sign-in email in its payload.
      delete from auth.audit_log_entries where payload ->> 'actor_id' = account.id::text;
      summary := summary || jsonb_build_object('account_erased', true);
    else
      summary := summary || jsonb_build_object('account_erased', false);
    end if;
  end if;

  -- Last, the tombstone. The CHECK makes this exhaustive.
  update public.candidates
     set full_name = null, email = null, phone = null, city = null, state = null,
         linkedin_url = null, expected_salary = null, expected_salary_unit = null,
         work_authorized = null, desk = null, specialty = null, profile_id = null,
         deleted_at = now(), erased_at = now()
   where id = c;

  return summary;
end;
$$;

create function public.claim_storage_erasures(p_limit integer default 50)
returns table (id uuid, source_table text, object_path text)
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures s
     set attempts = s.attempts + 1, last_attempt_at = now()
   where s.id in (
     select x.id from public.storage_erasures x
     where x.status = 'pending'
     order by x.created_at
     limit p_limit
     for update skip locked
   )
  returning s.id, s.source_table, s.object_path
$$;
create function public.complete_storage_erasure(p_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures
     set status = 'done', completed_at = now(), object_path = null, last_error_state = null
   where id = p_id and status = 'pending'
$$;
create function public.fail_storage_erasure(p_id uuid, p_error_code text)
returns void
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures
     set last_error_state = p_error_code
   where id = p_id and status = 'pending'
$$;

revoke execute on function
  public.claim_storage_erasures(integer),
  public.complete_storage_erasure(uuid),
  public.fail_storage_erasure(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function
  public.claim_storage_erasures(integer),
  public.complete_storage_erasure(uuid),
  public.fail_storage_erasure(uuid, text)
to service_role;


drop function private.document_bucket(boolean);
