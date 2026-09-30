-- Behavioural tests: each role, acting through the same `authenticated` /
-- `anon` role and JWT claims PostgREST uses, can do exactly what migration 5
-- says and nothing more. Everything runs in one transaction and rolls back.
--
-- A failing test here is a policy that does not hold. Treat it as an outage.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(95);

-- -----------------------------------------------------------------------------
-- Harness
-- -----------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create table tests.ids (name text primary key, id uuid not null);
grant select on tests.ids to anon, authenticated, service_role;

create function tests.id(fixture text) returns uuid
language sql stable as $$ select id from tests.ids where name = fixture $$;

-- Become a user, as PostgREST would: the authenticated role plus JWT claims.
-- NULL returns to the trusted migration role with no claims at all.
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
  perform set_config('request.jwt.claim.email', '', true);
  if fixture is null then
    return;
  end if;
  if fixture = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('request.jwt.claim.role', 'anon', true);
    perform set_config('role', 'anon', true);
    return;
  end if;
  select u.id, u.email into user_id, user_email
  from auth.users u where u.id = tests.id(fixture);
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', user_email)::text, true);
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.email', user_email, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.act_as(text) to anon, authenticated, service_role;

-- Run a statement as someone and report its SQLSTATE ('ok' if it succeeded).
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

select tests.act_as(null);

-- -----------------------------------------------------------------------------
-- Fixtures: one user per role (two recruiters, two employer users, two job
-- seekers), two employers, two requisitions, candidates, documents, jobs and
-- three submissions. All clearly fake.
-- -----------------------------------------------------------------------------
insert into tests.ids (name, id)
select name, gen_random_uuid()
from unnest(array[
  'super', 'padmin', 'bdm', 'fdr', 'rec', 'rec2', 'ra', 'cm', 'mm', 'emp', 'emp2', 'js', 'js2', 'newbie',
  'e1', 'e2', 'r1', 'r2', 'cA', 'cB', 'cS', 'cS2', 'cF', 'cF2', 'dF_o', 'dF_s', 'j_test', 'j_live',
  'sub1', 'sub2', 'sub3'
]) as name;

insert into auth.users (id, email, raw_user_meta_data)
select tests.id(n), n || '@tests.example.test', jsonb_build_object('full_name', 'Test ' || n)
from unnest(array['super', 'padmin', 'bdm', 'fdr', 'rec', 'rec2', 'ra', 'cm', 'mm',
                  'emp', 'emp2', 'js', 'js2', 'newbie']) as n;

insert into public.employers (id, company_name, owner_id, status) values
  (tests.id('e1'), 'Example Test Employer One', tests.id('bdm'), 'active'),
  (tests.id('e2'), 'Example Test Employer Two', tests.id('bdm'), 'active');

update public.profiles set role = 'super_admin' where id = tests.id('super');
update public.profiles set role = 'platform_admin' where id = tests.id('padmin');
update public.profiles set role = 'bdm' where id = tests.id('bdm');
update public.profiles set role = 'full_desk_recruiter' where id = tests.id('fdr');
update public.profiles set role = 'recruiter' where id in (tests.id('rec'), tests.id('rec2'));
update public.profiles set role = 'research_analyst' where id = tests.id('ra');
update public.profiles set role = 'content_manager' where id = tests.id('cm');
update public.profiles set role = 'marketing_manager' where id = tests.id('mm');
update public.profiles set role = 'employer_user', employer_id = tests.id('e1') where id = tests.id('emp');
update public.profiles set role = 'employer_user', employer_id = tests.id('e2') where id = tests.id('emp2');

insert into public.requisitions (id, employer_id, title, desk, specialty, engagement_type, owner_id, status, internal_notes) values
  (tests.id('r1'), tests.id('e1'), 'Test ICU Nurse', 'healthcare', 'nursing', 'contract', tests.id('bdm'), 'open', 'internal only'),
  (tests.id('r2'), tests.id('e2'), 'Test Data Engineer', 'technology', 'data', 'direct-hire', tests.id('bdm'), 'open', 'internal only');

insert into public.requisition_assignments (requisition_id, recruiter_id) values
  (tests.id('r1'), tests.id('rec')),
  (tests.id('r1'), tests.id('fdr')),
  (tests.id('r2'), tests.id('rec2'));

insert into public.candidates (id, profile_id, full_name, email, phone, source, owner_id) values
  (tests.id('cA'), tests.id('js'), 'Test Seeker A', 'js@tests.example.test', '555-0100', 'self_registered', null),
  (tests.id('cB'), tests.id('js2'), 'Test Seeker B', 'js2@tests.example.test', '555-0101', 'self_registered', null),
  (tests.id('cS'), null, 'Test Sourced S', 's@tests.example.test', '555-0102', 'sourced', tests.id('rec')),
  (tests.id('cS2'), null, 'Test Sourced S2', 's2@tests.example.test', '555-0103', 'sourced', tests.id('rec2')),
  (tests.id('cF'), null, 'Test Sourced F', 'f@tests.example.test', '555-0104', 'sourced', tests.id('fdr')),
  (tests.id('cF2'), null, 'Test Sourced F2', 'f2@tests.example.test', '555-0105', 'sourced', tests.id('fdr'));

insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original) values
  (tests.id('dF_o'), tests.id('cF'), 'resume', 'test/f-original.pdf', true);
insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original, parent_document_id, version) values
  (tests.id('dF_s'), tests.id('cF'), 'resume', 'test/f-scrubbed-v1.pdf', false, tests.id('dF_o'), 1);

insert into public.jobs (id, requisition_id, slug, title, desk, specialty, engagement_type, work_mode,
                         city, state, salary_min, salary_max, salary_unit, status, is_test,
                         published_at, expires_at) values
  (tests.id('j_test'), tests.id('r1'), 'do-not-ship-fixture-test-job', 'DO-NOT-SHIP-FIXTURE test job',
   'healthcare', 'nursing', 'contract', 'onsite', 'Testville', 'TX', 50, 60, 'hour', 'published', true,
   now() - interval '1 day', now() + interval '30 days'),
  (tests.id('j_live'), tests.id('r1'), 'do-not-ship-fixture-live-job', 'DO-NOT-SHIP-FIXTURE live job',
   'healthcare', 'nursing', 'contract', 'onsite', 'Testville', 'TX', 50, 60, 'hour', 'published', false,
   now() - interval '1 day', now() + interval '30 days');

insert into public.leads (source, contact_name, company_name, owner_id)
values ('research', 'Test Lead', 'Example Test Prospect', tests.id('bdm'));

-- sub1: unsent, pending BDM. sub2: sent to employer one. sub3: sent to employer two.
insert into public.submissions (id, candidate_id, requisition_id, submitted_by, candidate_consent_obtained, status) values
  (tests.id('sub1'), tests.id('cS'), tests.id('r1'), tests.id('rec'), true, 'pending-bdm-review');
insert into public.submissions (id, candidate_id, requisition_id, submitted_by, candidate_consent_obtained,
                                bdm_decision, sent_to_employer_at, shared_document_id, status) values
  (tests.id('sub2'), tests.id('cF'), tests.id('r1'), tests.id('fdr'), true, 'approved', now(), tests.id('dF_s'), 'sent-to-employer'),
  (tests.id('sub3'), tests.id('cS2'), tests.id('r2'), tests.id('rec2'), true, 'approved', now(), null, 'sent-to-employer');

-- =============================================================================
-- job_seeker
-- =============================================================================
select tests.act_as('js');

select is((select count(*) from public.candidates where id = tests.id('cA')), 1::bigint,
  'job_seeker reads their own candidate row');
select is((select count(*) from public.candidates where id = tests.id('cB')), 0::bigint,
  'job_seeker CANNOT select another candidate''s row');
select is((select count(*) from public.candidates), 1::bigint,
  'job_seeker sees exactly one candidate: themselves');
select is((select count(*) from public.submissions), 0::bigint,
  'job_seeker sees no submissions');
select is((select count(*) from public.employers) + (select count(*) from public.requisitions), 0::bigint,
  'job_seeker sees no employers or requisitions');
select is((select count(*) from public.jobs where id = tests.id('j_live')), 1::bigint,
  'job_seeker sees a live published job');
select is((select count(*) from public.jobs where id = tests.id('j_test')), 0::bigint,
  'job_seeker never sees a test job, even one marked published');
select is((select count(*) from public.public_jobs), 1::bigint,
  'public_jobs lists only the live job');

select tests.act_as(null);

select is(tests.sqlstate_as('js', $$ update public.candidates set phone = '555-0199' where id = tests.id('cA') $$), 'ok',
  'job_seeker edits their own contact details');
select is(tests.sqlstate_as('js', $$ update public.candidates set status = 'placed' where id = tests.id('cA') $$), '42501',
  'job_seeker cannot change their own candidate status');
select is(tests.sqlstate_as('js', $$ update public.profiles set role = 'super_admin' where id = tests.id('js') $$), '42501',
  'job_seeker cannot promote themselves');
select is(tests.sqlstate_as('js', $$ update public.candidates set email = 'someone-else@tests.example.test' where id = tests.id('cA') $$), '42501',
  'job_seeker cannot move their record to another email address');
select is((select phone from public.candidates where id = tests.id('cB')), '555-0101',
  'job_seeker updates never reach another candidate');
select is(tests.sqlstate_as('js', $$ update public.candidates set phone = '000' where id = tests.id('cB') $$), 'ok',
  '(an update aimed at another candidate matches nothing, silently)');
select is((select phone from public.candidates where id = tests.id('cB')), '555-0101',
  'another candidate''s row is unchanged');
select is(tests.sqlstate_as('js', format(
  $$ insert into public.applications (candidate_id, job_id, consent_store) values (%L, %L, true) $$,
  tests.id('cA'), tests.id('j_live'))), 'ok',
  'job_seeker applies to a live job');
select is(tests.sqlstate_as('js', format(
  $$ insert into public.applications (candidate_id, job_id, consent_store) values (%L, %L, true) $$,
  tests.id('cA'), tests.id('j_test'))), '42501',
  'job_seeker cannot apply to a test job');
select is(tests.sqlstate_as('js', format(
  $$ insert into public.applications (candidate_id, job_id, consent_store) values (%L, %L, true) $$,
  tests.id('cB'), tests.id('j_live'))), '42501',
  'job_seeker cannot apply on someone else''s behalf');

-- =============================================================================
-- employer_user
-- =============================================================================
select tests.act_as('emp');

select is((select count(*) from public.submissions), 0::bigint,
  'employer_user reads nothing from the submissions table directly');
select is((select count(*) from public.submissions where id = tests.id('sub1')), 0::bigint,
  'employer_user CANNOT select a submission where sent_to_employer_at is null (table)');
select is((select count(*) from public.employer_submissions where id = tests.id('sub1')), 0::bigint,
  'employer_user CANNOT select a submission where sent_to_employer_at is null (portal view)');
select is((select count(*) from public.employer_submissions where id = tests.id('sub2')), 1::bigint,
  'employer_user sees a submission sent to their employer');
select is((select count(*) from public.employer_submissions where id = tests.id('sub3')), 0::bigint,
  'employer_user never sees another employer''s submissions');
select is((select candidate_email from public.employer_submissions where id = tests.id('sub2')), null,
  'employer_user sees no candidate email before placement');
select is((select candidate_phone from public.employer_submissions where id = tests.id('sub2')), null,
  'employer_user sees no candidate phone before placement');
select is((select count(*) from public.candidates) + (select count(*) from public.candidate_documents), 0::bigint,
  'employer_user reads no candidates or documents directly');
select results_eq(
  $$ select id from public.employer_submission_documents $$,
  array[tests.id('dF_s')],
  'employer_user can open only the scrubbed version, never the original');
select is((select count(*) from public.requisitions), 0::bigint,
  'employer_user reads no requisitions from the table (internal notes live there)');
select results_eq(
  $$ select id from public.employer_requisitions $$,
  array[tests.id('r1')],
  'employer_user sees only their own employer''s requisitions');

select tests.act_as(null);

select ok(not exists (
  select 1 from information_schema.columns
  where table_name = 'employer_requisitions' and column_name in ('internal_notes', 'owner_id')),
  'the employer requisition view carries no internal notes or owner');
select is(tests.sqlstate_as('emp', format(
  $$ update public.employer_requisitions set title = 'hijacked' where id = %L $$, tests.id('r1'))), '42501',
  'employer_user cannot write through the portal view');

-- =============================================================================
-- recruiter, full_desk_recruiter, bdm: the approval gate
-- =============================================================================
select tests.act_as('rec');
select is((select count(*) from public.submissions where id = tests.id('sub1')), 1::bigint,
  'recruiter reads the submission they created');
select is((select count(*) from public.submissions where id = tests.id('sub3')), 0::bigint,
  'recruiter cannot read another recruiter''s submission');
select is((select count(*) from public.candidates where id = tests.id('cS2')), 0::bigint,
  'recruiter cannot read another recruiter''s candidate');
select tests.act_as(null);

select is(tests.sqlstate_as('rec', format(
  $$ update public.submissions set sent_to_employer_at = now() where id = %L $$, tests.id('sub1'))), '42501',
  'recruiter CANNOT set sent_to_employer_at');
select is(tests.sqlstate_as('rec', format(
  $$ update public.submissions set bdm_decision = 'approved' where id = %L $$, tests.id('sub1'))), '42501',
  'recruiter cannot approve their own submission');
select is(tests.sqlstate_as('rec', format(
  $$ insert into public.submissions (candidate_id, requisition_id, submitted_by, direct_submission)
     values (%L, %L, %L, true) $$, tests.id('cS'), tests.id('r1'), tests.id('rec'))), '42501',
  'recruiter cannot make a direct submission');

select is(tests.sqlstate_as('bdm', format(
  $$ update public.submissions set bdm_decision = 'approved' where id = %L $$, tests.id('sub1'))), 'ok',
  'the assigned BDM approves a submission');
select is(tests.sqlstate_as('rec', format(
  $$ update public.submissions set sent_to_employer_at = now() where id = %L $$, tests.id('sub1'))), '42501',
  'recruiter still cannot send it once approved');
select is(tests.sqlstate_as('bdm', format(
  $$ update public.submissions set sent_to_employer_at = now(), status = 'sent-to-employer' where id = %L $$,
  tests.id('sub1'))), 'ok',
  'the BDM sends an approved, consented submission');
select is(
  (select string_agg(event_type, ',' order by event_type)
   from public.submission_events where submission_id = tests.id('sub1')),
  'bdm_decision,consent_recorded,created,sent_to_employer,status_changed',
  'every step of that submission is on its timeline');

-- A full-desk recruiter's direct submission.
insert into tests.ids values ('sub_direct', gen_random_uuid());
select is(tests.sqlstate_as('fdr', format(
  $$ insert into public.submissions (id, candidate_id, requisition_id, submitted_by, direct_submission, candidate_consent_obtained)
     values (%L, %L, %L, %L, true, true) $$,
  tests.id('sub_direct'), tests.id('cF2'), tests.id('r2'), tests.id('fdr'))), '42501',
  'full_desk_recruiter cannot submit to a requisition they are not on');
select is(tests.sqlstate_as('fdr', format(
  $$ insert into public.submissions (id, candidate_id, requisition_id, submitted_by, direct_submission, candidate_consent_obtained)
     values (%L, %L, %L, %L, true, true) $$,
  tests.id('sub_direct'), tests.id('cF2'), tests.id('r1'), tests.id('fdr'))), 'ok',
  'full_desk_recruiter makes a direct submission');
select is(tests.sqlstate_as('fdr', format(
  $$ update public.submissions set sent_to_employer_at = now() where id = %L $$, tests.id('sub_direct'))), 'ok',
  'full_desk_recruiter sends a consented direct submission without BDM approval');

-- =============================================================================
-- The gate is a CHECK constraint: it binds the trusted backend too.
-- =============================================================================
insert into tests.ids values ('sub_gate', gen_random_uuid());
insert into public.submissions (id, candidate_id, requisition_id, submitted_by) values
  (tests.id('sub_gate'), tests.id('cS2'), tests.id('r1'), tests.id('rec'));

select throws_ok(
  format($$ update public.submissions set sent_to_employer_at = now(), bdm_decision = 'approved' where id = %L $$, tests.id('sub_gate')),
  '23514', null,
  'a submission CANNOT be sent to an employer without the candidate''s consent');
update public.submissions set candidate_consent_obtained = true where id = tests.id('sub_gate');
select throws_ok(
  format($$ update public.submissions set sent_to_employer_at = now() where id = %L $$, tests.id('sub_gate')),
  '23514', null,
  'a submission CANNOT be sent without BDM approval when direct_submission is false');
select throws_ok(
  format($$ update public.submissions set bdm_decision = 'rejected', sent_to_employer_at = now() where id = %L $$, tests.id('sub_gate')),
  '23514', null,
  'a rejected submission cannot be sent');
select throws_ok(
  format($$ update public.submissions set status = 'interviewing' where id = %L $$, tests.id('sub_gate')),
  '23514', null,
  'a submission cannot claim a post-send status without having been sent');
select throws_ok(
  format($$ insert into public.interviews (submission_id, mode) values (%L, 'video') $$, tests.id('sub_gate')),
  '23514', null,
  'no interview can be scheduled on an unsent submission');
select lives_ok(
  format($$ update public.submissions set direct_submission = true, sent_to_employer_at = now() where id = %L $$, tests.id('sub_gate')),
  'with consent, a direct submission may be sent without approval');

-- =============================================================================
-- audit_log: no role can update or delete it.
-- =============================================================================
select ok((select count(*) from public.audit_log) > 0, 'the audit trigger has been writing rows');
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'public.submissions' and record_id = tests.id('sub1')
    and actor_id = tests.id('bdm') and action = 'UPDATE'),
  'the BDM''s approval is in the audit log under their id');

select is_empty(
  $$ select n || ' update: ' || tests.sqlstate_as(n, 'update public.audit_log set action = ''DELETE''')
     from unnest(array['super', 'padmin', 'bdm', 'fdr', 'rec', 'ra', 'cm', 'mm', 'emp', 'js']) as n
     where tests.sqlstate_as(n, 'update public.audit_log set action = ''DELETE''') <> '42501' $$,
  'NO role can update audit_log (all ten tried)');
select is_empty(
  $$ select n || ' delete: ' || tests.sqlstate_as(n, 'delete from public.audit_log')
     from unnest(array['super', 'padmin', 'bdm', 'fdr', 'rec', 'ra', 'cm', 'mm', 'emp', 'js', 'anon']) as n
     where tests.sqlstate_as(n, 'delete from public.audit_log') <> '42501' $$,
  'NO role can delete from audit_log (all ten, and anon, tried)');
select is(tests.sqlstate_as('super', $$ insert into public.audit_log (action, table_name) values ('INSERT', 'forged') $$), '42501',
  'not even super_admin can forge an audit entry');

set local role service_role;
select throws_ok($$ update public.audit_log set action = 'DELETE' $$, '42501', null,
  'service_role cannot update audit_log');
select throws_ok($$ delete from public.audit_log $$, '42501', null,
  'service_role cannot delete from audit_log');
reset role;
select throws_ok($$ delete from public.audit_log $$, '42501', null,
  'the owning role cannot delete from audit_log either (trigger)');
select throws_ok($$ truncate public.audit_log $$, '42501', null,
  'audit_log cannot be truncated');

-- =============================================================================
-- Jobs: pay transparency is a schema rule.
-- =============================================================================
select throws_ok(
  format($$ insert into public.jobs (requisition_id, slug, title, desk, engagement_type, work_mode, salary_unit, status)
            values (%L, 'no-range', 'No range', 'healthcare', 'contract', 'remote', 'hour', 'draft') $$, tests.id('r1')),
  '23502', null,
  'a job cannot exist without a salary range, even as a draft');
select throws_ok(
  format($$ insert into public.jobs (requisition_id, slug, title, desk, engagement_type, work_mode,
                                     salary_min, salary_max, salary_unit, status, published_at)
            values (%L, 'no-expiry', 'No expiry', 'healthcare', 'contract', 'remote', 10, 20, 'hour', 'published', now()) $$, tests.id('r1')),
  '23514', null,
  'a published job cannot exist without an expiry');
select throws_ok(
  format($$ update public.jobs set salary_max = null where id = %L $$, tests.id('j_live')),
  '23502', null,
  'a published job cannot lose its salary range');
select throws_ok(
  format($$ update public.jobs set salary_min = 90 where id = %L $$, tests.id('j_live')),
  '23514', null,
  'a salary range cannot be inverted');

-- =============================================================================
-- anon
-- =============================================================================
select is(tests.sqlstate_as('anon',
  $$ insert into public.leads (source, contact_name, contact_email, company_name) values ('website_form', 'Test', 'lead@tests.example.test', 'Example Test Co') $$),
  'ok', 'anon submits the Request Talent form');
select is(tests.sqlstate_as('anon',
  $$ insert into public.resume_submissions (full_name, email, consent_store) values ('Test', 'r@tests.example.test', true) $$),
  'ok', 'anon submits the Upload Resume form');
select is(tests.sqlstate_as('anon',
  $$ insert into public.contact_messages (full_name, email, enquiry_type, subject, message) values ('Test', 'c@tests.example.test', 'employer', 's', 'm') $$),
  'ok', 'anon submits the Contact form');
select is(tests.sqlstate_as('anon',
  $$ insert into public.leads (source, status, contact_name) values ('website_form', 'qualified', 'Test') $$),
  '42501', 'anon cannot set a lead''s internal fields');
select is(tests.sqlstate_as('anon',
  $$ insert into public.candidates (full_name, email) values ('Test', 'probe@tests.example.test') $$),
  '42501', 'anon cannot write candidates (no email-existence oracle)');
select is_empty(
  $$ select t || ': ' || tests.sqlstate_as('anon', format('select 1 from public.%I limit 1', t))
     from unnest(array['leads', 'resume_submissions', 'contact_messages', 'desks', 'jobs',
                       'public_jobs', 'candidates', 'profiles', 'audit_log', 'employer_submissions']) as t
     where tests.sqlstate_as('anon', format('select 1 from public.%I limit 1', t)) <> '42501' $$,
  'anon can SELECT nothing: not its own form rows, not taxonomy, not published jobs');

-- =============================================================================
-- Profiles and the super_admin boundary
-- =============================================================================
insert into tests.ids values ('sneaky', gen_random_uuid());
insert into auth.users (id, email, raw_user_meta_data)
values (tests.id('sneaky'), 'sneaky@tests.example.test', '{"role": "super_admin", "full_name": "Test Sneaky"}');
select is((select role from public.profiles where id = tests.id('sneaky')), 'job_seeker'::public.app_role,
  'signup always creates a job_seeker, whatever the metadata claims');

select is(tests.sqlstate_as('padmin', format(
  $$ update public.profiles set role = 'recruiter' where id = %L $$, tests.id('newbie'))), 'ok',
  'platform_admin promotes a user to recruiter');
select is(tests.sqlstate_as('padmin', format(
  $$ update public.profiles set role = 'super_admin' where id = %L $$, tests.id('newbie'))), '42501',
  'platform_admin cannot grant super_admin');
select is(tests.sqlstate_as('padmin', format(
  $$ update public.profiles set full_name = 'renamed' where id = %L $$, tests.id('super'))), '42501',
  'platform_admin cannot change a super_admin');
select is(tests.sqlstate_as('padmin', $$ update public.audit_settings set retention_days = 30 $$), 'ok',
  '(platform_admin''s retention update matches no rows)');
select is((select retention_days from public.audit_settings), null,
  'platform_admin cannot alter audit retention');
select is(tests.sqlstate_as('super', format(
  $$ update public.profiles set role = 'super_admin' where id = %L $$, tests.id('newbie'))), 'ok',
  'super_admin grants super_admin');
select is(tests.sqlstate_as('super', format(
  $$ update public.profiles set is_active = false where id = %L $$, tests.id('super'))), '42501',
  'nobody deactivates themselves');

-- =============================================================================
-- Role boundaries outside the pipeline
-- =============================================================================
select tests.act_as('ra');
select is((select count(*) from public.candidates), 0::bigint, 'research_analyst sees no candidates');
select ok((select count(*) from public.leads) > 0, 'research_analyst sees leads');
select is((select count(*) from public.employers where id in (tests.id('e1'), tests.id('e2'))), 2::bigint,
  'research_analyst sees employers, including ones they do not own');
select tests.act_as('cm');
select is((select count(*) from public.leads) + (select count(*) from public.employers)
          + (select count(*) from public.candidates) + (select count(*) from public.activities), 0::bigint,
  'content_manager sees no CRM data at all');
select tests.act_as(null);
select is(tests.sqlstate_as('cm', format(
  $$ insert into public.content (type, slug, title, status, author_id, reviewer_id)
     values ('article', 'test-approved', 'Test', 'approved', %1$L, %1$L) $$, tests.id('cm'))), '23514',
  'content cannot be approved by its own author');

-- =============================================================================
-- SMS consent
-- =============================================================================
select throws_ok(
  format($$ insert into public.message_log (channel, candidate_id, to_address, body) values ('sms', %L, '555-0102', 'hi') $$, tests.id('cS')),
  '23514', null, 'an SMS cannot be sent to someone with no opt-in');
insert into public.communication_consents (candidate_id, channel, address, consent_given, given_at, source)
values (tests.id('cS'), 'sms', '555-0102', true, now(), 'written');
select lives_ok(
  format($$ insert into public.message_log (channel, candidate_id, to_address, body) values ('sms', %L, '555-0102', 'hi') $$, tests.id('cS')),
  'an SMS can be sent after an opt-in');
select public.record_opt_out('sms', tests.id('cS'), null, 'sms_keyword', 'STOP');
select throws_ok(
  format($$ insert into public.message_log (channel, candidate_id, to_address, body) values ('sms', %L, '555-0102', 'hi') $$, tests.id('cS')),
  '23514', null, 'after a STOP, sending an SMS is impossible');
select throws_ok(
  format($$ update public.communication_consents set withdrawn_at = null where candidate_id = %L $$, tests.id('cS')),
  '23514', null, 'a STOP cannot be undone by editing the row');

-- =============================================================================
-- Soft delete
-- =============================================================================
select is(tests.sqlstate_as('rec', format(
  $$ update public.candidates set deleted_at = '2000-01-01' where id = %L $$, tests.id('cS'))), 'ok',
  'a recruiter soft-deletes a candidate they own');
select is((select deleted_at from public.candidates where id = tests.id('cS')), now(),
  'deleted_at is the deleting transaction''s timestamp, whatever the client sent');
select is(tests.sqlstate_as('rec2', format(
  $$ update public.candidates set deleted_at = now() where id = %L $$, tests.id('cF'))), 'ok',
  '(a recruiter''s delete aimed at a candidate they do not work matches nothing)');
select is((select deleted_at from public.candidates where id = tests.id('cF')), null,
  'only those who may update a row may soft-delete it');

-- now() is fixed for this whole transaction, so a row deleted in an earlier
-- one is simulated by writing its deleted_at directly as the backend.
insert into tests.ids values ('c_gone', gen_random_uuid());
insert into public.candidates (id, full_name, email, source, owner_id, deleted_at)
values (tests.id('c_gone'), 'Test Gone', 'gone@tests.example.test', 'sourced', tests.id('rec'), now() - interval '1 day');
select tests.act_as('rec');
select is((select count(*) from public.candidates where id = tests.id('c_gone')), 0::bigint,
  'a candidate deleted earlier is invisible to the recruiter who owns it');
select is(tests.sqlstate_as('rec', format(
  $$ update public.candidates set deleted_at = null where id = %L $$, tests.id('c_gone'))), 'ok',
  '(the recruiter''s restore matches nothing)');
select tests.act_as('padmin');
select is((select count(*) from public.candidates where id = tests.id('c_gone')), 1::bigint,
  'an administrator still sees it, to restore it');
select tests.act_as(null);
select isnt((select deleted_at from public.candidates where id = tests.id('c_gone')), null,
  'only an administrator can restore a deleted row');
select is(tests.sqlstate_as('rec', format(
  $$ delete from public.candidates where id = %L $$, tests.id('cS2'))), '42501',
  'nobody hard-deletes');

select * from finish();
rollback;
