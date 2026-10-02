-- The retention floor, computed per rule from the records it covers
-- (migration 10). One transaction, rolled back.
--
-- now() is fixed for the whole transaction. Records dated in the past are
-- inserted by the trusted role with an explicit created_at.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

-- -----------------------------------------------------------------------------
-- Harness (as in 20_erasure.test.sql).
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
  if fixture = 'service_role' then
    perform set_config('request.jwt.claims', json_build_object('role', fixture)::text, true);
    perform set_config('request.jwt.claim.role', fixture, true);
    perform set_config('role', fixture, true);
    return;
  end if;
  select u.id, u.email into user_id, user_email from auth.users u where u.id = tests.id(fixture);
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'email', user_email)::text, true);
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

-- Record a request for a candidate and accept it; returns the status.
create function tests.request_and_accept(candidate text, request text) returns text
language plpgsql as $$
begin
  insert into tests.ids (name, id)
  values (request, tests.value_as('padmin', format(
    $q$ select public.record_deletion_request(%L, 'email')::text $q$, tests.id(candidate)))::uuid);
  return tests.value_as('padmin', format(
    $q$ select public.accept_deletion_request(%L, 'email_confirmation') $q$, tests.id(request)));
end;
$$;

create function tests.floor_of(candidate text) returns timestamptz
language sql stable as $$
  select f.retain_until from private.retention_floor(tests.id(candidate)) f
$$;

select tests.act_as(null);

-- -----------------------------------------------------------------------------
-- Fixtures.
--   fNone   created today, with nothing on file.
--   fApp    one application, three months ago, to a Texas job.
--   fCA     one application, a month ago, to a California job. Nothing else.
--   fCA2    the same as fCA, plus a logged message and an engagement
--           preference; its application is later erased.
--   fEdit   one application, three months ago, to a Texas job; then edited.
-- -----------------------------------------------------------------------------
insert into tests.ids (name, id)
select n, gen_random_uuid() from unnest(array[
  'super', 'padmin', 'bdm', 'rec', 'e1', 'rTX', 'rCA', 'jTX', 'jCA',
  'fNone', 'fApp', 'fCA', 'fCA2', 'fEdit', 'aApp', 'aCA', 'aCA2', 'aEdit'
]) as n;

insert into auth.users (id, email, raw_user_meta_data)
select tests.id(n), n || '@floor.example.test', jsonb_build_object('full_name', 'Test ' || n)
from unnest(array['super', 'padmin', 'bdm', 'rec']) as n;
update public.profiles set role = 'super_admin' where id = tests.id('super');
update public.profiles set role = 'platform_admin' where id = tests.id('padmin');
update public.profiles set role = 'bdm' where id = tests.id('bdm');
update public.profiles set role = 'recruiter' where id = tests.id('rec');

insert into public.employers (id, company_name, owner_id, status)
values (tests.id('e1'), 'Example Floor Employer', tests.id('bdm'), 'active');
insert into public.requisitions (id, employer_id, title, desk, specialty, engagement_type, owner_id, status, state) values
  (tests.id('rTX'), tests.id('e1'), 'Test Texas Nurse', 'healthcare', 'nursing', 'direct-hire', tests.id('bdm'), 'open', 'TX'),
  (tests.id('rCA'), tests.id('e1'), 'Test California Nurse', 'healthcare', 'nursing', 'direct-hire', tests.id('bdm'), 'open', 'CA');
insert into public.jobs (id, requisition_id, slug, title, desk, specialty, engagement_type, work_mode,
                         city, state, salary_min, salary_max, salary_unit, status, is_test, published_at, expires_at) values
  (tests.id('jTX'), tests.id('rTX'), 'do-not-ship-fixture-floor-tx', 'DO-NOT-SHIP-FIXTURE floor TX',
   'healthcare', 'nursing', 'direct-hire', 'onsite', 'Testville', 'TX', 70000, 90000, 'year', 'published',
   false, now() - interval '1 year', now() + interval '30 days'),
  (tests.id('jCA'), tests.id('rCA'), 'do-not-ship-fixture-floor-ca', 'DO-NOT-SHIP-FIXTURE floor CA',
   'healthcare', 'nursing', 'direct-hire', 'onsite', 'Testopolis', 'CA', 70000, 90000, 'year', 'published',
   false, now() - interval '1 year', now() + interval '30 days');

-- No candidate has a state of their own: California comes only from the job.
insert into public.candidates (id, full_name, email, source, owner_id) values
  (tests.id('fNone'), 'Test Floor None', 'none@floor.example.test', 'sourced', tests.id('rec'));
insert into public.candidates (id, full_name, email, source, owner_id, created_at) values
  (tests.id('fApp'), 'Test Floor App', 'app@floor.example.test', 'sourced', tests.id('rec'), now() - interval '3 months'),
  (tests.id('fCA'), 'Test Floor CA', 'ca@floor.example.test', 'sourced', tests.id('rec'), now() - interval '1 month'),
  (tests.id('fCA2'), 'Test Floor CA Two', 'ca2@floor.example.test', 'sourced', tests.id('rec'), now() - interval '1 month'),
  (tests.id('fEdit'), 'Test Floor Edit', 'edit@floor.example.test', 'sourced', tests.id('rec'), now() - interval '3 months');
insert into public.applications (id, candidate_id, job_id, consent_store, created_at) values
  (tests.id('aApp'), tests.id('fApp'), tests.id('jTX'), true, now() - interval '3 months'),
  (tests.id('aCA'), tests.id('fCA'), tests.id('jCA'), true, now() - interval '1 month'),
  (tests.id('aCA2'), tests.id('fCA2'), tests.id('jCA'), true, now() - interval '1 month'),
  (tests.id('aEdit'), tests.id('fEdit'), tests.id('jTX'), true, now() - interval '3 months');
insert into public.message_log (channel, candidate_id, to_address, body)
values ('email', tests.id('fCA2'), 'ca2@floor.example.test', 'Hi CA Two');
insert into public.candidate_engagement_types (candidate_id, engagement_type)
values (tests.id('fCA2'), 'contract');

-- =============================================================================
-- 1. The rules are data: each names what it covers.
-- =============================================================================
-- The seeded values themselves are pinned in 00_schema.test.sql.
select throws_ok(
  $$ update public.retention_rules set record_kinds = array['candidate_row'] where code = 'ca-feha' $$,
  '23514', null, 'a rule cannot name a kind of record that does not exist');

-- =============================================================================
-- 2. No qualifying record: scheduled at once, no year's wait.
-- =============================================================================
select is(tests.floor_of('fNone'), null::timestamptz,
  'a candidate with nothing on file has no floor - the candidate row does not count');
select is(tests.request_and_accept('fNone', 'qNone'), 'scheduled',
  'created today with nothing on file: scheduled, not deferred a year');

-- =============================================================================
-- 3. One application, three months ago: the application plus one year.
-- =============================================================================
select is(tests.request_and_accept('fApp', 'qApp'), 'deferred',
  'one application: deferred');
select is((select deferred_until from public.deletion_requests where id = tests.id('qApp')),
  now() - interval '3 months' + interval '1 year',
  'until the application plus one year, not the candidate''s last edit plus one year');
select is((select deferral_basis from public.deletion_requests where id = tests.id('qApp')),
  array['adea-employment-agency', 'title-vii-ada-gina'],
  'basis: the two federal rules; no California link');

-- =============================================================================
-- 4. The candidate's only record is an application in California: four years.
-- =============================================================================
select is(tests.request_and_accept('fCA', 'qCA'), 'deferred', 'a California application: deferred');
select is((select deferred_until from public.deletion_requests where id = tests.id('qCA')),
  now() - interval '1 month' + interval '4 years',
  'until the application plus four years (FEHA), the candidate having no state of their own');
select is((select deferral_basis from public.deletion_requests where id = tests.id('qCA')),
  array['adea-employment-agency', 'ca-feha', 'title-vii-ada-gina'],
  'basis names FEHA alongside the federal rules');

-- =============================================================================
-- 5. Editing the candidate, logging a message, recording a preference: none
--    moves the floor.
-- =============================================================================
create temporary table edit_floor as select tests.floor_of('fEdit') as before;
select is(tests.sqlstate_as('rec', format(
  $$ update public.candidates set city = 'Elsewhere' where id = %L $$, tests.id('fEdit'))), 'ok',
  'the owning recruiter edits the candidate today');
insert into public.message_log (channel, candidate_id, to_address, body)
values ('email', tests.id('fEdit'), 'edit@floor.example.test', 'Hi Edit');
insert into public.candidate_engagement_types (candidate_id, engagement_type)
values (tests.id('fEdit'), 'direct-hire');
select is(tests.floor_of('fEdit'), (select before from edit_floor),
  'the floor is unmoved by an edit, a logged message or an engagement preference');
select is(tests.floor_of('fEdit'), now() - interval '3 months' + interval '1 year',
  'and is still the application plus one year');

-- =============================================================================
-- 6. Deferred, then the application erased: the floor does not outlive it.
-- =============================================================================
select is(tests.request_and_accept('fCA2', 'qCA2'), 'deferred', 'fCA2: deferred four years, like fCA');
select tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$);
select ok((select partially_executed_at is not null and status = 'deferred'
                  and deferred_until = now() - interval '1 month' + interval '4 years'
           from public.deletion_requests where id = tests.id('qCA2')),
  'the first step ran; the request is still deferred to the four-year date');
select is((select count(*) from public.message_log where candidate_id = tests.id('fCA2'))
          + (select count(*) from public.candidate_engagement_types where candidate_id = tests.id('fCA2')),
  0::bigint,
  'the first step erased the message log and engagement preferences: no rule covers them now');
select is((select count(*) from public.applications where candidate_id = tests.id('fCA2')), 1::bigint,
  'and kept the application, which the rules do cover');

-- The application goes, as a prior erasure removes it. The stored four-year
-- date is still on the request; nothing else holds the candidate.
delete from public.applications where id = tests.id('aCA2');
select is(tests.floor_of('fCA2'), null::timestamptz,
  'with the application gone there is no floor: none is stored on the candidate');
select is(tests.value_as('service_role', $$ select public.process_due_deletion_requests()::text $$), '1',
  'the worker takes the request although its stored date is four years away');
select is((select status from public.deletion_requests where id = tests.id('qCA2')), 'executed',
  'and executes it: the four-year floor did not survive the record it came from');

-- =============================================================================
-- 7. OFCCP switched on: every affected floor moves to two years, with no
--    migration - a data change by a super_admin.
-- =============================================================================
select is(tests.sqlstate_as('padmin',
  $$ update public.retention_rules set is_active = true where code = 'ofccp-federal-contractor' $$), 'ok',
  '(a platform_admin''s update matches nothing)');
select is((select deferred_until from public.deletion_requests where id = tests.id('qApp')),
  now() - interval '3 months' + interval '1 year', 'so nothing moved');

select is(tests.sqlstate_as('super',
  $$ update public.retention_rules set is_active = true where code = 'ofccp-federal-contractor' $$), 'ok',
  'a super_admin switches OFCCP on');
select ok((select deferred_until = now() - interval '3 months' + interval '2 years'
                  and deferral_basis = array['adea-employment-agency', 'ofccp-federal-contractor', 'title-vii-ada-gina']
           from public.deletion_requests where id = tests.id('qApp')),
  'the open deferral is re-dated at once: the application plus two years, OFCCP named');
select is(tests.floor_of('fEdit'), now() - interval '3 months' + interval '2 years',
  'a candidate with no request: their floor is two years too');
select ok((select deferred_until = now() - interval '1 month' + interval '4 years'
                  and deferral_basis = array['adea-employment-agency', 'ca-feha', 'ofccp-federal-contractor', 'title-vii-ada-gina']
           from public.deletion_requests where id = tests.id('qCA')),
  'California''s four years still win where they apply; OFCCP is named as well');

select is(tests.sqlstate_as('super',
  $$ update public.retention_rules set is_active = false where code = 'ofccp-federal-contractor' $$), 'ok',
  'and switches it off again');
select is((select deferred_until from public.deletion_requests where id = tests.id('qApp')),
  now() - interval '3 months' + interval '1 year',
  'switched off again, the deferral returns to one year: over-retention is fixed the same way');

select * from finish();
rollback;
