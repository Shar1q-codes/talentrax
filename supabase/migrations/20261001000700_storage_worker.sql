-- =============================================================================
-- 7. THE STORAGE WORKER'S QUEUE
--
-- storage_erasures (migration 6) is drained by the Edge Function
-- supabase/functions/storage-erasure-worker. This migration gives the queue
-- what a real worker needs: which bucket an object is in, a lease so two
-- workers never handle one row, backoff so a failing row never blocks the
-- rest, and an outcome that says how a row was finished.
--
-- THE DATABASE DECIDES THE OUTCOME, NOT THE STORAGE API'S RESPONSE.
-- Measured against the local Storage API: a bulk delete answers 200 [] for
-- an object that does not exist, for a bucket that does not exist, and for a
-- caller whose role may not delete. All three look identical. A worker that
-- trusted the response would mark a misconfigured bucket, or a wrong key, as
-- "already gone" and leave every byte where it was. So the outcome comes
-- from storage.objects - the Storage API's own record of what exists, which
-- nothing else may delete from (storage.protect_delete):
--
--   deleted         present when claimed, absent when completed
--   already_absent  absent when claimed: nothing to delete, which is success
--   still_present   the worker reported success but the object is still
--                   there - refused, recorded as a failure, retried
--
-- "Could not reach it" is a failure, never an outcome: the row stays pending
-- with last_error_state ('network', 'http_503', 'bucket_missing', ...) and is
-- retried. The two can never be confused in the row: a done row has an
-- outcome and no error; a pending row has an error and no outcome.
-- =============================================================================

-- Which bucket a document lives in. Originals and scrubbed copies are in
-- separate buckets with separate policies (migration 8), so a role allowed a
-- scrubbed copy cannot reach the original by guessing its path.
create function private.document_bucket(is_original boolean)
returns text
language sql immutable
set search_path = ''
as $$
  select case when is_original then 'candidate-originals' else 'candidate-scrubbed' end
$$;

-- The outbox was empty until now in every environment (no erasure has run
-- anywhere real), so the reshaping below needs no backfill.
alter table public.storage_erasures
  drop constraint storage_erasures_done_is_cleared,
  drop column source_table,
  add column reason text not null default 'erasure' check (reason in ('erasure', 'orphan')),
  add column bucket text not null check (bucket in ('candidate-originals', 'candidate-scrubbed', 'resume-intake')),
  add column outcome text check (outcome in ('deleted', 'already_absent')),
  add column present_at_claim boolean,
  add column claim_token uuid,
  add column next_attempt_at timestamptz not null default now(),
  add column needs_attention_at timestamptz,
  alter column deletion_request_id drop not null,
  add constraint storage_erasures_reason_has_request
    check ((reason = 'erasure') = (deletion_request_id is not null)),
  add constraint storage_erasures_done_is_cleared check (
    (status = 'done') = (completed_at is not null and outcome is not null and object_path is null)
    and (status = 'pending') = (object_path is not null and outcome is null)
  );

-- One pending row per object: an erasure and the orphan sweep never queue
-- the same object twice.
create unique index storage_erasures_one_pending_idx
  on public.storage_erasures (bucket, object_path) where status = 'pending';
drop index public.storage_erasures_pending_idx;
create index storage_erasures_due_idx
  on public.storage_erasures (next_attempt_at) where status = 'pending';

delete from private.column_classification
 where table_name = 'storage_erasures' and column_name = 'source_table';
insert into private.column_classification (table_name, column_name, personal) values
  ('storage_erasures', 'reason', false),
  ('storage_erasures', 'bucket', false),
  ('storage_erasures', 'outcome', false);

-- The erasure queues objects with their bucket. Same body as migration 6
-- except the insert into storage_erasures.
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
  insert into public.storage_erasures (deletion_request_id, reason, bucket, object_path)
  select req.id, 'erasure', private.document_bucket(d.is_original), d.storage_path
  from public.candidate_documents d where d.candidate_id = c
  union all
  select req.id, 'erasure', 'resume-intake', rs.resume_storage_path
  from public.resume_submissions rs
  where rs.id = any (intake_ids) and rs.resume_storage_path is not null
  on conflict (bucket, object_path) where status = 'pending' do nothing;
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

-- -----------------------------------------------------------------------------
-- The worker's contract.
-- -----------------------------------------------------------------------------

-- A failure: back off exponentially, cap at six hours, never give up. After
-- eight attempts the row is flagged for a human, and keeps being retried:
-- the object still has to go.
create function private.storage_erasure_failed(target uuid, error_code text)
returns void
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures
     set last_error_state = error_code,
         claim_token = null,
         next_attempt_at = now() + least(interval '1 minute' * power(2, least(attempts, 20)), interval '6 hours'),
         needs_attention_at = coalesce(needs_attention_at, case when attempts >= 8 then now() end)
   where id = target
$$;

-- Take up to p_limit due rows. Each claimed row gets a fresh token and a
-- lease: its next_attempt_at moves past the lease, so a second worker
-- running at the same moment cannot take it (SKIP LOCKED covers the instant
-- of the claim; the lease covers the minutes after). A worker that dies
-- mid-batch loses nothing: the lease expires and the row is due again.
-- A row whose bucket does not exist is never handed out: it fails here,
-- with 'bucket_missing', because the Storage API would answer 200 [] for it.
create function public.claim_storage_erasures(p_limit integer default 50, p_lease interval default interval '5 minutes')
returns table (id uuid, bucket text, object_path text, claim_token uuid, present boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select s.id, s.bucket, s.object_path
    from public.storage_erasures s
    where s.status = 'pending' and s.next_attempt_at <= now()
    order by s.next_attempt_at, s.created_at
    limit p_limit
    for update skip locked
  loop
    update public.storage_erasures s
       set attempts = s.attempts + 1,
           last_attempt_at = now(),
           claim_token = gen_random_uuid(),
           next_attempt_at = now() + p_lease,
           present_at_claim = exists (
             select 1 from storage.objects o where o.bucket_id = r.bucket and o.name = r.object_path)
     where s.id = r.id;

    if not exists (select 1 from storage.buckets b where b.id = r.bucket) then
      perform private.storage_erasure_failed(r.id, 'bucket_missing');
      continue;
    end if;

    return query
      select s.id, s.bucket, s.object_path, s.claim_token, s.present_at_claim
      from public.storage_erasures s where s.id = r.id;
  end loop;
end;
$$;

-- The worker has deleted the object, or found nothing to delete. The
-- database checks, and decides the outcome. A stale token (the lease expired
-- and another worker took the row) changes nothing and says so.
create function public.complete_storage_erasure(p_id uuid, p_claim_token uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  r public.storage_erasures;
  result text;
begin
  select * into r from public.storage_erasures where id = p_id for update;
  if r.id is null or r.status <> 'pending' or r.claim_token is distinct from p_claim_token then
    return 'stale';
  end if;
  if exists (select 1 from storage.objects o where o.bucket_id = r.bucket and o.name = r.object_path) then
    perform private.storage_erasure_failed(r.id, 'still_present');
    return 'still_present';
  end if;
  result := case when r.present_at_claim then 'deleted' else 'already_absent' end;
  update public.storage_erasures
     set status = 'done', outcome = result, completed_at = now(),
         object_path = null, claim_token = null, last_error_state = null
   where id = r.id;
  return result;
end;
$$;

-- The worker could not delete it: network, a Storage error, a timeout.
create function public.fail_storage_erasure(p_id uuid, p_claim_token uuid, p_error_code text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  r public.storage_erasures;
begin
  select * into r from public.storage_erasures where id = p_id for update;
  if r.id is null or r.status <> 'pending' or r.claim_token is distinct from p_claim_token then
    return 'stale';
  end if;
  perform private.storage_erasure_failed(r.id, p_error_code);
  return 'failed';
end;
$$;

-- What a human looks at. Administrators and the worker.
create function public.storage_erasure_backlog()
returns table (pending bigint, needs_attention bigint, oldest_pending_at timestamptz, oldest_attention_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'pending' and needs_attention_at is not null),
         min(created_at) filter (where status = 'pending'),
         min(needs_attention_at) filter (where status = 'pending')
  from public.storage_erasures
  where private.is_admin() or coalesce(auth.role(), '') = 'service_role' or current_user = 'postgres'
$$;

-- And what makes them look. Hourly, pg_cron runs this; it FAILS - which
-- cron.job_run_details records, and the dashboard shows - while any row
-- needs attention or anything has waited more than a day. A silent queue
-- (no worker configured at all) trips it as surely as a broken one.
create function private.assert_storage_erasures_healthy()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  b record;
begin
  select * into b from public.storage_erasure_backlog();
  if b.needs_attention > 0 or b.oldest_pending_at < now() - interval '1 day' then
    raise exception 'storage erasure backlog: % pending, % need attention, oldest pending since %',
      b.pending, b.needs_attention, b.oldest_pending_at
      using errcode = 'P0001';
  end if;
end;
$$;

drop function public.claim_storage_erasures(integer);
drop function public.complete_storage_erasure(uuid);
drop function public.fail_storage_erasure(uuid, text);

revoke execute on function
  public.claim_storage_erasures(integer, interval),
  public.complete_storage_erasure(uuid, uuid),
  public.fail_storage_erasure(uuid, uuid, text),
  public.storage_erasure_backlog()
from public, anon, authenticated, service_role;
grant execute on function
  public.claim_storage_erasures(integer, interval),
  public.complete_storage_erasure(uuid, uuid),
  public.fail_storage_erasure(uuid, uuid, text),
  public.storage_erasure_backlog()
to service_role;
grant execute on function public.storage_erasure_backlog() to authenticated;
revoke all on function private.storage_erasure_failed(uuid, text), private.assert_storage_erasures_healthy()
  from public, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Scheduling. pg_cron calls the Edge Function over pg_net every five
-- minutes. The URL and the key come from Vault, set per environment and
-- never in a migration; until both exist the call is skipped, and the
-- health check above starts failing a day later, which is the point.
-- -----------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create function private.invoke_storage_worker()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  base text;
  key text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'storage_worker_url';
  select decrypted_secret into key from vault.decrypted_secrets where name = 'storage_worker_key';
  if base is null or key is null then
    return;
  end if;
  if not exists (select 1 from public.storage_erasures where status = 'pending' and next_attempt_at <= now()) then
    return;
  end if;
  perform net.http_post(
    url := base,
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;
revoke all on function private.invoke_storage_worker() from public, anon, authenticated, service_role;

select cron.schedule('invoke-storage-worker', '*/5 * * * *', $$select private.invoke_storage_worker()$$);
select cron.schedule('check-storage-erasures', '17 * * * *', $$select private.assert_storage_erasures_healthy()$$);
