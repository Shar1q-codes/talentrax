-- Candidate erasure (migration 6): requests, deferral, execution, and the
-- audit log never holding what was erased. One transaction, rolled back.
--
-- now() is fixed for the whole transaction, so every fixture is "just now"
-- unless it is inserted with an explicit, older created_at by the trusted
-- role. That is how the tests put a candidate past or inside their floor.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(78);

-- -----------------------------------------------------------------------------
-- Harness (as in 10_access.test.sql, plus service_role).
-- -----------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create table tests.ids (name text primary key, id uuid not null);
grant select on tests.ids to anon, authenticated, service_role;
create function tests.id(fixture text) returns uuid
language sql stable as $$ select id from tests.ids where name = fixture $$;

create function tests.act_as(fixture text) returns void
language plpgsql as $$
declare
  user_id uuid;
  user_email text;
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  if fixture is null then
    return;
  end if;
  if fixture in ('anon', 'service_role') then
    perform set_config('request.jwt.claims', json_build_object('role', fixture)::text, true);
    perform set_config('request.jwt.claim.role', fixture, true);
    perform set_config('role', fixture, true);
    return;
  end if;
  select u.id, u.email into user_id, user_email from auth.users u where u.id = tests.id(fixture);
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', user_email, 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.act_as(text) to anon, authenticated, service_role;

create function tests.sqlstate_as(fixture text, stmt text) returns text
language plpgsql as $$
declare
  result text := 'ok';
begin
  begin
    perform tests.act_as(fixture);
    execute stmt;
  exception when others then
    result := sqlstate;
  end;
  perform tests.act_as(null);
  return result;
end;
$$;
grant execute on function tests.sqlstate_as(text, text) to anon, authenticated, service_role;

-- Run a statement returning one value as someone.
create function tests.value_as(fixture text, stmt text) returns text
language plpgsql as $$
declare
  result text;
begin
  perform tests.act_as(fixture);
  execute stmt into result;
  perform tests.act_as(null);
  return result;
end;
$$;
grant execute on function tests.value_as(text, text) to anon, authenticated, service_role;

select tests.act_as(null);

-- -----------------------------------------------------------------------------
-- Fixtures.
--   cFull    self-registered (js), with a row in every dependent table.
--   cNone    sourced, three years ago, with nothing else at all.
--   cCancel  sourced today, cancelled before anything runs.
--   cHold    sourced long ago, under a legal hold.
--   cFail    sourced long ago, whose erasure is made to fail halfway.
--   cJ2      js2's own record, cOwned rec's: the audit IP checks.
-- -----------------------------------------------------------------------------
insert into tests.ids (name, id)
select n, gen_random_uuid() from unnest(array[
  'super', 'padmin', 'bdm', 'rec', 'js', 'js2',
  'e1', 'r1', 'j1', 'cFull', 'cNone', 'cCancel', 'cHold', 'cFail', 'cJ2', 'cOwned',
  'rs', 'rsFail', 'dO', 'dS', 'a1', 's1', 's2', 'i1', 'o1', 'o2', 'p1', 'req_full'
]) as n;

insert into auth.users (id, email, raw_user_meta_data)
select tests.id(n), n || '@erasure.example.test', jsonb_build_object('full_name', 'Test ' || n)
from unnest(array['super', 'padmin', 'bdm', 'rec', 'js2']) as n;
-- The candidate's account carries their real (fixture) name and address.
insert into auth.users (id, email, raw_user_meta_data)
values (tests.id('js'), 'full@erasure.example.test', '{"full_name": "Erasure Test Full"}');
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), tests.id('js'), tests.id('js')::text, 'email',
        jsonb_build_object('sub', tests.id('js'), 'email', 'full@erasure.example.test'), now(), now(), now());
insert into auth.audit_log_entries (instance_id, id, payload, created_at, ip_address)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        json_build_object('actor_id', tests.id('js'), 'actor_username', 'full@erasure.example.test', 'action', 'login'),
        now(), '203.0.113.7');

update public.profiles set role = 'super_admin' where id = tests.id('super');
update public.profiles set role = 'platform_admin' where id = tests.id('padmin');
update public.profiles set role = 'bdm' where id = tests.id('bdm');
update public.profiles set role = 'recruiter' where id = tests.id('rec');

insert into public.employers (id, company_name, owner_id, status)
values (tests.id('e1'), 'Example Erasure Employer', tests.id('bdm'), 'active');
insert into public.requisitions (id, employer_id, title, desk, specialty, engagement_type, owner_id, status, state)
values (tests.id('r1'), tests.id('e1'), 'Test ICU Nurse', 'healthcare', 'nursing', 'direct-hire', tests.id('bdm'), 'open', 'TX');
insert into public.requisition_assignments (requisition_id, recruiter_id) values (tests.id('r1'), tests.id('rec'));
insert into public.jobs (id, requisition_id, slug, title, desk, specialty, engagement_type, work_mode,
                         city, state, salary_min, salary_max, salary_unit, status, is_test, published_at, expires_at)
values (tests.id('j1'), tests.id('r1'), 'do-not-ship-fixture-erasure-job', 'DO-NOT-SHIP-FIXTURE erasure job',
        'healthcare', 'nursing', 'direct-hire', 'onsite', 'Testville', 'TX', 70000, 90000, 'year', 'published',
        false, now() - interval '1 day', now() + interval '30 days');

insert into public.candidates (id, profile_id, full_name, email, phone, city, state, desk, specialty,
                               linkedin_url, expected_salary, expected_salary_unit, source, owner_id)
values (tests.id('cFull'), tests.id('js'), 'Erasure Test Full', 'full@erasure.example.test', '555-0142',
        'Testville', 'TX', 'healthcare', 'nursing', 'https://linkedin.com/in/erasure-full', 80000, 'year',
        'self_registered', tests.id('rec'));
insert into public.candidates (id, profile_id, full_name, email, source, owner_id)
values (tests.id('cJ2'), tests.id('js2'), 'Test Seeker Two', 'js2@erasure.example.test', 'self_registered', null);
insert into public.candidates (id, full_name, email, source, owner_id) values
  (tests.id('cCancel'), 'Test Cancel', 'cancel@erasure.example.test', 'sourced', tests.id('rec')),
  (tests.id('cOwned'), 'Test Owned', 'owned@erasure.example.test', 'sourced', tests.id('rec'));
-- Long-ago records: inserted by the trusted role, which may set created_at.
insert into public.candidates (id, full_name, email, source, owner_id, created_at) values
  (tests.id('cNone'), 'Test None', 'none@erasure.example.test', 'sourced', tests.id('rec'), now() - interval '3 years'),
  (tests.id('cHold'), 'Test Hold', 'hold@erasure.example.test', 'sourced', tests.id('rec'), now() - interval '3 years'),
  (tests.id('cFail'), 'Test Fail', 'fail@erasure.example.test', 'sourced', tests.id('rec'), now() - interval '3 years');

-- cFull's file: intake, preferences, documents, embedding, application,
-- submission with its timeline, interview, two offers, placement,
-- activities, consent and messages.
insert into public.resume_submissions (id, candidate_id, full_name, email, phone, state, message, consent_store,
                                       resume_storage_path, resume_filename, status)
values (tests.id('rs'), tests.id('cFull'), 'Erasure Test Full', 'full@erasure.example.test', '555-0142', 'TX',
        'resume message from Full', true, tests.id('rs')::text || '/resume.pdf', 'Full_Name_Resume.pdf', 'converted');
insert into public.candidate_engagement_types (candidate_id, engagement_type) values (tests.id('cFull'), 'contract');
insert into public.candidate_documents (id, candidate_id, kind, storage_path, original_filename, is_original)
values (tests.id('dO'), tests.id('cFull'), 'resume', 'test/full-original.pdf', 'Full_Name_Resume.pdf', true);
insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original, parent_document_id, version)
values (tests.id('dS'), tests.id('cFull'), 'resume', 'test/full-scrubbed-v1.pdf', false, tests.id('dO'), 1);
insert into public.candidate_embeddings (candidate_id, source_document_id, embedding, model_name)
values (tests.id('cFull'), tests.id('dO'), array_fill(0.1::real, array[1536])::extensions.vector, 'test-model');
insert into public.applications (id, candidate_id, job_id, consent_store, cover_note)
values (tests.id('a1'), tests.id('cFull'), tests.id('j1'), true, 'cover note naming Erasure Test Full');
insert into public.submissions (id, candidate_id, requisition_id, submitted_by, application_id, shared_document_id,
                                candidate_consent_obtained, bdm_decision, bdm_notes, sent_to_employer_at, status)
values (tests.id('s1'), tests.id('cFull'), tests.id('r1'), tests.id('rec'), tests.id('a1'), tests.id('dS'),
        true, 'approved', 'bdm note on Full', now(), 'sent-to-employer');
update public.submissions set employer_response = 'employer liked Full', employer_response_at = now()
 where id = tests.id('s1');
insert into public.interviews (id, submission_id, mode, location_or_link, interviewer_names, outcome, feedback)
values (tests.id('i1'), tests.id('s1'), 'phone', 'call 555-0142', array['Test Interviewer'], 'advanced', 'feedback on Full');
insert into public.offers (id, submission_id, salary, salary_unit, status, responded_at, decline_reason) values
  (tests.id('o2'), tests.id('s1'), 75000, 'year', 'declined', now(), 'declined: family reasons');
insert into public.offers (id, submission_id, salary, salary_unit, status, responded_at)
values (tests.id('o1'), tests.id('s1'), 82000, 'year', 'accepted', now());
insert into public.placements (id, offer_id, start_date) values (tests.id('p1'), tests.id('o1'), current_date);
insert into public.activities (subject_type, subject_id, kind, body, actor_id) values
  ('candidate', tests.id('cFull'), 'call', 'called Full', tests.id('rec')),
  ('application', tests.id('a1'), 'note', 'reviewed Full', tests.id('rec')),
  ('submission', tests.id('s1'), 'note', 'sent Full', tests.id('rec')),
  ('placement', tests.id('p1'), 'note', 'placed Full', tests.id('rec'));
insert into public.communication_consents (candidate_id, channel, address, consent_given, given_at, source)
values (tests.id('cFull'), 'sms', '555-0142', true, now(), 'web_form');
insert into public.message_log (channel, candidate_id, to_address, body) values
  ('sms', tests.id('cFull'), '555-0142', 'Hi Full'),
  ('email', tests.id('cFull'), 'full@erasure.example.test', 'Hi Full by email');

-- cCancel and cFail have things that must survive a cancel or a failed run.
insert into public.candidate_embeddings (candidate_id, embedding, model_name) values
  (tests.id('cCancel'), array_fill(0.2::real, array[1536])::extensions.vector, 'test-model'),
  (tests.id('cFail'), array_fill(0.3::real, array[1536])::extensions.vector, 'test-model');
insert into public.resume_submissions (id, candidate_id, full_name, email, consent_store, resume_storage_path, status, created_at)
values (tests.id('rsFail'), tests.id('cFail'), 'Test Fail', 'fail@erasure.example.test', true,
        tests.id('rsFail')::text || '/resume.pdf', 'converted', now() - interval '3 years');

-- =============================================================================
-- 1. The audit log does not keep personal data, or a candidate's IP.
-- =============================================================================
select set_config('request.headers', '{"x-real-ip": "203.0.113.9", "user-agent": "erasure-probe"}', true);

select is(tests.sqlstate_as('js2', format(
  $$ update public.candidates set phone = '555-0177' where id = %L $$, tests.id('cJ2'))), 'ok',
  'a candidate edits their own phone number');
select ok((select ip is null and user_agent is null from public.audit_log
           where record_id = tests.id('cJ2') and action = 'UPDATE'),
  'the audit row for a candidate''s own action carries no IP address or user agent');
select ok((select new_values -> '_personal_columns' = '["phone"]'::jsonb
                  and not (new_values ? 'phone') and not (old_values ? 'phone')
           from public.audit_log where record_id = tests.id('cJ2') and action = 'UPDATE'),
  'the audit row says the phone changed, and holds neither value');

select is(tests.sqlstate_as('rec', format(
  $$ update public.candidates set status = 'active' where id = %L $$, tests.id('cOwned'))), 'ok',
  'a recruiter updates a candidate they own');
select is((select host(ip) from public.audit_log
           where record_id = tests.id('cOwned') and action = 'UPDATE'),
  '203.0.113.9', 'a staff action keeps its IP address in the audit log');

select set_config('request.headers', '', true);

-- =============================================================================
-- 2. Who may ask, accept and execute.
-- =============================================================================
select is(tests.sqlstate_as('anon', $$ select public.request_my_deletion() $$), '42501',
  'anon cannot request a deletion');
select is(tests.sqlstate_as('rec', format(
  $$ select public.record_deletion_request(%L, 'email') $$, tests.id('cOwned'))), '42501',
  'a recruiter cannot record a deletion request, not even for their own candidate');
select is(tests.sqlstate_as('bdm', format(
  $$ select public.record_deletion_request(%L, 'email') $$, tests.id('cOwned'))), '42501',
  'a BDM cannot record a deletion request');
select is(tests.sqlstate_as('js', format(
  $$ select public.record_deletion_request(%L, 'email') $$, tests.id('cJ2'))), '42501',
  'a candidate cannot record a request for someone else');
select is(tests.sqlstate_as('rec', $$ select public.request_my_deletion() $$), '42501',
  'request_my_deletion is for candidates; a recruiter gets nothing from it');
select is(tests.sqlstate_as('js', $$ insert into public.deletion_requests (candidate_id, manner) values (tests.id('cJ2'), 'email') $$), '42501',
  'nobody writes deletion_requests directly');

-- The candidate asks.
insert into tests.ids (name, id)
values ('req_full_actual', tests.value_as('js', $$ select public.request_my_deletion()::text $$)::uuid);
select is((select status from public.deletion_requests where id = tests.id('req_full_actual')), 'requested',
  'a candidate''s own request is recorded as requested');
select is(tests.value_as('js', $$ select public.request_my_deletion()::text $$)::uuid, tests.id('req_full_actual'),
  'asking twice returns the same open request');
select is(tests.value_as('js', $$ select count(*)::text from public.deletion_requests $$), '1',
  'the candidate sees their request');
select is(tests.value_as('js2', $$ select count(*)::text from public.deletion_requests $$), '0',
  'another candidate does not');
select is(tests.value_as('rec', $$ select count(*)::text from public.deletion_requests $$), '0',
  'a recruiter does not see deletion requests');

select is(tests.sqlstate_as('rec', format(
  $$ select public.accept_deletion_request(%L, 'signed_in_account') $$, tests.id('req_full_actual'))), '42501',
  'a recruiter cannot accept a request');
select is(tests.sqlstate_as('js', format(
  $$ select public.accept_deletion_request(%L, 'signed_in_account') $$, tests.id('req_full_actual'))), '42501',
  'the candidate cannot accept their own request');
select is(tests.sqlstate_as('padmin', $$ select public.process_due_deletion_requests() $$), '42501',
  'an administrator cannot execute erasure directly - only the worker can');
select is(tests.sqlstate_as('super', $$ select public.process_due_deletion_requests() $$), '42501',
  'nor can a super_admin');
select is(tests.sqlstate_as('js', $$ select public.process_due_deletion_requests() $$), '42501',
  'nor the candidate');
select is(tests.sqlstate_as('padmin', format($$ select private.erase_candidate(r) from public.deletion_requests r where r.id = %L $$,
  tests.id('req_full_actual'))), '42501',
  'the erasure steps themselves are not callable by any API role');
select ok(exists (select 1 from cron.job where jobname = 'process-deletion-requests'),
  'pg_cron runs the worker on a schedule');

-- =============================================================================
-- 3. A deletion that is deferred, then executes - with rows in every table.
-- =============================================================================
select is(tests.value_as('padmin', format(
  $$ select public.accept_deletion_request(%L, 'signed_in_account') $$, tests.id('req_full_actual'))), 'deferred',
  'accepting cFull''s request defers it: their records are under a retention floor');
select is((select deferred_until from public.deletion_requests where id = tests.id('req_full_actual')),
  now() + interval '1 year',
  'deferred until the latest action on their records plus one year (federal rules; no California link)');
select is((select deferral_basis from public.deletion_requests where id = tests.id('req_full_actual')),
  array['adea-employment-agency', 'title-vii-ada-gina'],
  'the basis names the rules that apply');
select is(tests.value_as('js', $$ select status || ' until ' || deferred_until::date from public.deletion_requests $$),
  'deferred until ' || (now() + interval '1 year')::date,
  'the candidate can see that it was accepted, and until when it is deferred');

-- Restriction.
select is(tests.value_as('rec', format($$ select count(*)::text from public.candidates where id = %L $$, tests.id('cFull'))), '0',
  'once accepted, the candidate is hidden from the recruiter who owned them');
select is(tests.value_as('rec', format($$ select count(*)::text from public.submissions where id = %L $$, tests.id('s1'))), '0',
  'and their submissions from the recruiter who made them');
select is(tests.value_as('padmin', format($$ select count(*)::text from public.candidates where id = %L $$, tests.id('cFull'))), '1',
  'an administrator still sees them');
select throws_ok(
  format($$ insert into public.applications (candidate_id, job_id, consent_store) values (%L, %L, true) $$,
         tests.id('cFull'), tests.id('j1')),
  '42501', null, 'nothing new can be created for a restricted candidate, even by the trusted backend');
select is((select count(*) from public.communication_consents
           where candidate_id = tests.id('cFull') and channel = 'sms' and consent_given and withdrawn_at is null), 0::bigint,
  'accepting withdrew their SMS opt-in');

-- First pass: only what no rule covers.
select is(tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$), '1',
  'the worker advances the request');
select is((select count(*) from public.candidate_embeddings where candidate_id = tests.id('cFull')), 0::bigint,
  'deferred: the embedding, which no rule covers, is erased at once');
select is((select count(*) from public.candidate_documents where candidate_id = tests.id('cFull'))
          + (select count(*) from public.applications where candidate_id = tests.id('cFull')), 3::bigint,
  'deferred: the retained records are intact');
select ok((select partially_executed_at is not null and status = 'deferred'
           from public.deletion_requests where id = tests.id('req_full_actual')),
  'the request is still deferred, and marked partially executed');
select is(tests.sqlstate_as('js', format($$ select public.cancel_deletion_request(%L) $$, tests.id('req_full_actual'))), '23514',
  'once erasure has begun the request can no longer be cancelled');
select is(tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$), '0',
  'a deferred request is left alone until its date');

-- The floor passes (simulated: a super_admin sets every period to zero).
select is(tests.sqlstate_as('padmin', $$ update public.retention_rules set retention_period = interval '0' $$), 'ok',
  '(a platform_admin''s update to retention rules matches nothing)');
select is((select count(*) from public.retention_rules where retention_period = interval '0'), 0::bigint,
  'only a super_admin can change a retention period');

-- Before the floor passes, cNone: nothing but a candidate row, three years old.
insert into tests.ids (name, id)
values ('req_none', tests.value_as('padmin', format($$ select public.record_deletion_request(%L, 'email')::text $$, tests.id('cNone')))::uuid);
select is(tests.value_as('padmin', format($$ select public.accept_deletion_request(%L, 'email_confirmation') $$, tests.id('req_none'))),
  'scheduled', 'a candidate with no rows anywhere, past any floor, is scheduled, not deferred');

select is(tests.sqlstate_as('super', $$ update public.retention_rules set retention_period = interval '0' $$), 'ok',
  'a super_admin changes the periods');
-- Time passes: the trusted role moves the stored date into the past, as the
-- calendar eventually would. The worker recomputes the floor when it gets
-- there, and with the periods at zero, the floor has passed.
update public.deletion_requests set deferred_until = now() - interval '1 second'
 where id = tests.id('req_full_actual');
create temporary table event_count as
  select count(*) as n from public.submission_events where submission_id = tests.id('s1');

select is(tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$), '2',
  'the worker executes both: cFull''s floor has passed, cNone had none');
select is((select status from public.deletion_requests where id = tests.id('req_full_actual')), 'executed', 'cFull: executed');
select is((select status from public.deletion_requests where id = tests.id('req_none')), 'executed', 'cNone: executed');

-- What is left of cFull.
select ok((select erased_at is not null and deleted_at is not null and full_name is null and email is null
                  and phone is null and profile_id is null and linkedin_url is null and expected_salary is null
           from public.candidates where id = tests.id('cFull')),
  'candidates: a tombstone with nothing that identifies the person');
select is((select count(*) from public.resume_submissions
           where id = tests.id('rs') or email_normalized = 'full@erasure.example.test'), 0::bigint,
  'resume_submissions: erased');
select is((select count(*) from public.candidate_documents where candidate_id = tests.id('cFull')), 0::bigint,
  'candidate_documents: originals and scrubbed copies erased');
select is((select count(*) from public.candidate_engagement_types where candidate_id = tests.id('cFull'))
          + (select count(*) from public.applications where candidate_id = tests.id('cFull')), 0::bigint,
  'candidate_engagement_types and applications: erased');
select is((select count(*) from public.activities
           where subject_id in (tests.id('cFull'), tests.id('a1'), tests.id('s1'), tests.id('p1'))), 0::bigint,
  'activities about them or their pipeline: erased');
select is((select count(*) from public.message_log where candidate_id = tests.id('cFull'))
          + (select count(*) from public.communication_consents where candidate_id = tests.id('cFull')), 0::bigint,
  'message_log and communication_consents: erased');
select ok((select bdm_notes is null and employer_response is null and shared_document_id is null and application_id is null
                  and candidate_consent_obtained and candidate_consent_at is not null and sent_to_employer_at is not null
           from public.submissions where id = tests.id('s1')),
  'submissions: kept for the employer''s record, free text cleared, consent evidence intact');
select is((select count(*) from public.submission_events where submission_id = tests.id('s1')),
          (select n from event_count),
  'submission_events: the erasure added no events of its own');
select is((select count(*) from public.submission_events where submission_id = tests.id('s1') and notes is not null), 0::bigint,
  'submission_events: kept, notes cleared');
select ok((select feedback is null and outcome is null and location_or_link is null and interviewer_names = array['Test Interviewer']
           from public.interviews where id = tests.id('i1')),
  'interviews: kept, what was said about the candidate cleared; the employer''s interviewers are not the requester''s data');
select ok((select count(*) = 2 and bool_and(decline_reason is null) from public.offers where submission_id = tests.id('s1')),
  'offers: kept, the candidate''s reason for declining cleared');
select is((select count(*) from public.placements where id = tests.id('p1')), 1::bigint,
  'placements: kept untouched - no column identifies the person');
select ok((select email is null and full_name is null and not is_active and deleted_at is not null
           from public.profiles where id = tests.id('js')),
  'their profile is anonymised and deactivated');
select ok((select email is null and raw_user_meta_data = '{}'::jsonb and banned_until = 'infinity'
           from auth.users where id = tests.id('js'))
          and not exists (select 1 from auth.identities where user_id = tests.id('js'))
          and not exists (select 1 from auth.audit_log_entries where payload ->> 'actor_id' = tests.id('js')::text),
  'their login: address, metadata, identities and GoTrue''s own audit entries gone');
select is((select count(*) from public.storage_erasures where deletion_request_id = tests.id('req_full_actual') and status = 'pending'),
  3::bigint, 'three stored objects (original, scrubbed copy, intake resume) are queued for the storage worker');

-- The audit log holds none of it, though every row above passed through it.
select is_empty(
  $$ select a.table_name || ':' || s
     from public.audit_log a
     cross join unnest(array[
       'Erasure Test Full', 'full@erasure.example.test', '555-0142', 'Full_Name_Resume.pdf',
       'resume message from Full', 'linkedin.com/in/erasure-full', 'cover note naming', 'bdm note on Full',
       'employer liked Full', 'feedback on Full', 'declined: family reasons', 'called Full', 'Hi Full',
       'test/full-original.pdf']) as s
     where coalesce(a.old_values::text, '') || coalesce(a.new_values::text, '') like '%' || s || '%' $$,
  'audit_log contains no trace of the candidate''s personal data, before, during or after erasure');

select ok((select (erasure_summary -> 'final' ->> 'resume_submissions')::int = 1
                  and (erasure_summary -> 'partial' ->> 'candidate_embeddings')::int = 1
           from public.deletion_requests where id = tests.id('req_full_actual')),
  'the request records counts per table, no values');
select ok((select erased_at is not null and full_name is null from public.candidates where id = tests.id('cNone'))
          and (select (erasure_summary -> 'final' ->> 'activities')::int = 0 from public.deletion_requests where id = tests.id('req_none')),
  'cNone: erased cleanly, with nothing else to touch');

-- Each object is queued in the bucket it lives in (migration 7).
select results_eq(
  format($$ select bucket, count(*)::int from public.storage_erasures
            where deletion_request_id = %L group by bucket order by bucket $$, tests.id('req_full_actual')),
  $$ values ('candidate-originals', 1), ('candidate-scrubbed', 1), ('resume-intake', 1) $$,
  'the original, the scrubbed copy and the intake resume are queued in their own buckets');

-- =============================================================================
-- 4. A request that is cancelled.
-- =============================================================================
insert into tests.ids (name, id)
values ('req_cancel', tests.value_as('padmin', format($$ select public.record_deletion_request(%L, 'phone')::text $$, tests.id('cCancel')))::uuid);
select is(tests.value_as('padmin', format($$ select public.accept_deletion_request(%L, 'email_confirmation', now() + interval '30 days') $$,
  tests.id('req_cancel'))), 'scheduled', 'cCancel is scheduled thirty days out (the floor is zero now)');
select is(tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$), '0',
  'nothing runs before execute_after');
select is(tests.sqlstate_as('padmin', format($$ select public.cancel_deletion_request(%L) $$, tests.id('req_cancel'))), 'ok',
  'an administrator cancels it before it runs');
select ok((select status = 'cancelled' and cancelled_at is not null from public.deletion_requests where id = tests.id('req_cancel'))
          and (select count(*) = 1 from public.candidate_embeddings where candidate_id = tests.id('cCancel'))
          and (select full_name = 'Test Cancel' from public.candidates where id = tests.id('cCancel')),
  'cancelled: nothing was erased');
select is(tests.value_as('rec', format($$ select count(*)::text from public.candidates where id = %L $$, tests.id('cCancel'))), '1',
  'and the restriction lifted: the recruiter sees the candidate again');

-- =============================================================================
-- 5. A legal hold.
-- =============================================================================
insert into tests.ids (name, id)
values ('req_hold', tests.value_as('padmin', format($$ select public.record_deletion_request(%L, 'email')::text $$, tests.id('cHold')))::uuid);
select is(tests.value_as('padmin', format($$ select public.accept_deletion_request(%L, 'email_confirmation') $$, tests.id('req_hold'))),
  'scheduled', 'cHold is scheduled');
insert into tests.ids (name, id)
values ('hold', tests.value_as('padmin', format($$ select public.place_legal_hold(%L, 'eeoc_charge')::text $$, tests.id('cHold')))::uuid);
select is(tests.sqlstate_as('rec', format($$ select public.place_legal_hold(%L, 'litigation') $$, tests.id('cOwned'))), '42501',
  'a recruiter cannot place a legal hold');
select tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$);
select ok((select status = 'deferred' and deferred_until is null and deferral_basis = array['legal_hold']
           from public.deletion_requests where id = tests.id('req_hold'))
          and (select erased_at is null from public.candidates where id = tests.id('cHold')),
  'a live hold defers the erasure without a date, and nothing is erased');
select tests.value_as('padmin', format($$ select public.release_legal_hold(%L)::text $$, tests.id('hold')));
select tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$);
select is((select status from public.deletion_requests where id = tests.id('req_hold')), 'executed',
  'released, the next run executes it');

-- =============================================================================
-- 6. A run that fails halfway changes nothing.
-- =============================================================================
create function tests.fail_on_erasure() returns trigger language plpgsql as $$
begin
  if new.id = tests.id('cFail') and new.erased_at is not null then
    raise exception 'simulated failure at the last step';
  end if;
  return new;
end;
$$;
create trigger fail_on_erasure before update on public.candidates
  for each row execute function tests.fail_on_erasure();

insert into tests.ids (name, id)
values ('req_fail', tests.value_as('padmin', format($$ select public.record_deletion_request(%L, 'email')::text $$, tests.id('cFail')))::uuid);
select tests.value_as('padmin', format($$ select public.accept_deletion_request(%L, 'email_confirmation') $$, tests.id('req_fail')));
select tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$);
select ok((select status = 'scheduled' and attempts = 1 and last_error_state = 'P0001'
           from public.deletion_requests where id = tests.id('req_fail')),
  'the failed run is recorded: an attempt and a SQLSTATE, no message text');
select ok((select count(*) = 1 from public.candidate_embeddings where candidate_id = tests.id('cFail'))
          and (select count(*) = 1 from public.resume_submissions where candidate_id = tests.id('cFail'))
          and (select count(*) = 0 from public.storage_erasures where deletion_request_id = tests.id('req_fail')),
  'and nothing it did before failing survived: no half-erased candidate, no orphaned outbox rows');
drop trigger fail_on_erasure on public.candidates;
select tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$);
select is((select status from public.deletion_requests where id = tests.id('req_fail')), 'executed',
  'the next run retries and succeeds');

-- =============================================================================
-- 7. Soft delete still works for the roles entitled to it.
-- =============================================================================
insert into public.submissions (id, candidate_id, requisition_id, submitted_by, status)
values (tests.id('s2'), tests.id('cOwned'), tests.id('r1'), tests.id('rec'), 'draft');
select is(tests.sqlstate_as('rec', format($$ update public.submissions set deleted_at = now() where id = %L $$, tests.id('s2'))), 'ok',
  'a recruiter soft-deletes their own submission');
select isnt((select deleted_at from public.submissions where id = tests.id('s2')), null,
  'and it is deleted');

select * from finish();
rollback;
