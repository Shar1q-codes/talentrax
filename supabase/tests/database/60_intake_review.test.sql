-- What staff need to review intake (migration 11): test versus real, and
-- whether a resume arrived. One transaction, rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

-- -----------------------------------------------------------------------------
-- Harness.
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
  user_id := tests.id(fixture);
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
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

select tests.act_as(null);

insert into tests.ids (name, id)
select n, gen_random_uuid() from unnest(array['padmin', 'rsOld', 'rsArrived', 'rsFresh', 'rsTyped']) as n;
insert into auth.users (id, email) values (tests.id('padmin'), 'padmin@review.example.test');
update public.profiles set role = 'platform_admin' where id = tests.id('padmin');

-- =============================================================================
-- 1. Test versus real.
-- =============================================================================
select is(private.is_reserved_test_address('someone@example.com'), true, 'example.com is reserved');
select is(private.is_reserved_test_address('a@Sub.Example.ORG'), false,
  'a subdomain of example.org is not one of the three reserved names');
select is(private.is_reserved_test_address('a@review.example.test'), true, 'the .test TLD is reserved');
select is(private.is_reserved_test_address('a@mail.invalid'), true, 'the .invalid TLD is reserved');
select is(private.is_reserved_test_address('nurse@hospital.org'), false, 'an ordinary address is not');
select is(private.is_reserved_test_address('not-an-address'), false, 'no domain at all is not a test address');

select is(tests.sqlstate_as('anon', $$
  insert into public.contact_messages (full_name, email, enquiry_type, subject, message)
  values ('Test Real', 'real.person@hospital.org', 'employer', 'Test subject', 'Hello') $$), 'ok',
  'anon sends a contact message from an ordinary address');
select is((select is_test from public.contact_messages where email = 'real.person@hospital.org'), false,
  'it is real by default');

select is(tests.sqlstate_as('anon', $$
  insert into public.contact_messages (full_name, email, enquiry_type, subject, message)
  values ('Test Smoke', 'smoke@review.example.test', 'employer', 'Test subject', 'Hello') $$), 'ok',
  'anon sends one from a reserved test domain');
select is((select is_test from public.contact_messages where email = 'smoke@review.example.test'), true,
  'it is flagged as a test automatically');

select is(tests.sqlstate_as('anon', $$
  insert into public.leads (source, contact_name, contact_email, company_name)
  values ('website_form', 'Test Lead', 'lead@example.net', 'Test Co') $$), 'ok',
  'anon sends a requisition from example.net');
select is((select is_test from public.leads where contact_email = 'lead@example.net'), true,
  'leads are flagged from contact_email');

select is(tests.sqlstate_as('anon', $$
  insert into public.contact_messages (full_name, email, enquiry_type, subject, message, is_test)
  values ('Test Hide', 'hide@hospital.org', 'employer', 'Test subject', 'Hello', true) $$), '42501',
  'anon cannot set is_test itself');

select is(tests.sqlstate_as('padmin', $$
  update public.contact_messages set is_test = true where email = 'real.person@hospital.org' $$), 'ok',
  'an administrator marks a row as a test');
select is((select is_test from public.contact_messages where email = 'real.person@hospital.org'), true,
  'and it is');

-- =============================================================================
-- 2. Whether a resume arrived. The trusted role plays the upload endpoint.
-- =============================================================================
select is(tests.sqlstate_as('anon', $$
  insert into public.resume_submissions (full_name, email, consent_store, resume_received_at)
  values ('Test Forge', 'forge@hospital.org', true, now()) $$), '42501',
  'anon cannot claim its resume arrived');

insert into public.resume_submissions (id, full_name, email, consent_store) values
  (tests.id('rsOld'), 'Test Old', 'old@hospital.org', true),
  (tests.id('rsArrived'), 'Test Arrived', 'arrived@hospital.org', true),
  (tests.id('rsFresh'), 'Test Fresh', 'fresh@hospital.org', true),
  (tests.id('rsTyped'), 'Test Typed', 'typed@hospital.org', true);
update public.resume_submissions
   set resume_storage_path = id::text || '/resume.pdf',
       resume_upload_issued_at = case when id = tests.id('rsFresh') then now() - interval '30 minutes'
                                      else now() - interval '3 hours' end
 where id in (tests.id('rsOld'), tests.id('rsArrived'), tests.id('rsFresh'), tests.id('rsTyped'));
insert into storage.objects (bucket_id, name) values ('resume-intake', tests.id('rsArrived')::text || '/resume.pdf');

select throws_ok(
  format($$ update public.resume_submissions set resume_received_at = now(), resume_rejected_at = now(),
            resume_rejected_reason = 'size_mismatch' where id = %L $$, tests.id('rsTyped')),
  '23514', null, 'a resume cannot be both received and rejected');

select is(tests.sqlstate_as('padmin', format(
  $$ update public.resume_submissions set resume_received_at = now() where id = %L $$, tests.id('rsTyped'))), '42501',
  'an administrator cannot mark a resume received: only the endpoint checks the file');

select is(private.expire_unreceived_resumes(), 2,
  'the hourly job finds the two rows whose upload URL expired with nothing uploaded');
select ok((select resume_rejected_reason = 'not_received' and resume_rejected_at is not null
           from public.resume_submissions where id = tests.id('rsOld'))
          and (select resume_rejected_at is null from public.resume_submissions where id = tests.id('rsArrived'))
          and (select resume_rejected_at is null from public.resume_submissions where id = tests.id('rsFresh')),
  'not_received for the expired empty one; untouched where the file arrived, and where the URL is still live');

select ok(exists (select 1 from cron.job where jobname = 'expire-unreceived-resumes'),
  'pg_cron runs it hourly');

select * from finish();
rollback;
