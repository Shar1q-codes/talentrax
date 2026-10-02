-- Staff need the second factor, and sign-in attempts are limited
-- (migration 14). One transaction, rolled back; now() is fixed, so every
-- attempt here is in the same window.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Act as a seeded user at a given assurance level, or as anon (uid null).
create function tests.act_as(uid uuid, email text, aal text) returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  if uid is null and email is null then
    if aal = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      perform set_config('request.jwt.claim.role', 'anon', true);
      perform set_config('role', 'anon', true);
    end if;
    return;
  end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'email', email, 'aal', aal)::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.act_as(uuid, text, text) to anon, authenticated, service_role;

create function tests.reset() returns void language sql as $$ select tests.act_as(null, null, null) $$;
grant execute on function tests.reset() to anon, authenticated, service_role;

-- Start from an empty ledger: a local database keeps real attempts for a day.
delete from private.sign_in_attempts;

-- =============================================================================
-- A. A staff role counts only at aal2.
-- =============================================================================
select tests.act_as('00000000-0000-4000-8000-000000000001', 'super.admin@example.test', 'aal1');
select is(private.current_role(), null, 'a super_admin with only a password holds no role');
select is((select count(*) from public.contact_messages), 0::bigint, 'and reads no contact message');
select is((select count(*) from public.leads), 0::bigint, 'no lead');
select is((select count(*) from public.candidates), 0::bigint, 'no candidate');
select is((select count(*) from public.profiles), 1::bigint, 'only their own profile');
select is((select role::text from public.profiles), 'super_admin',
  'which still says what they are, so sign-in can send them to the second factor');
select tests.reset();

select tests.act_as('00000000-0000-4000-8000-000000000001', 'super.admin@example.test', 'aal2');
select is(private.current_role()::text, 'super_admin', 'at aal2 the role counts');
select ok((select count(*) from public.contact_messages) > 0, 'and the contact messages are readable');
select tests.reset();

select tests.act_as('00000000-0000-4000-8000-000000000005', 'recruiter@example.test', 'aal1');
select is(private.current_role(), null, 'a recruiter with only a password holds no role either');
select tests.reset();

select tests.act_as('00000000-0000-4000-8000-00000000000a', 'job.seeker@example.test', 'aal1');
select is(private.current_role()::text, 'job_seeker', 'a job seeker needs no second factor');
select tests.reset();
select tests.act_as('00000000-0000-4000-8000-000000000009', 'employer.user@example.test', 'aal1');
select is(private.current_role()::text, 'employer_user', 'nor does an employer user');
select tests.reset();

-- =============================================================================
-- B. The sign-in limit.
-- =============================================================================
select tests.act_as(null, null, 'anon');
select is_empty(
  $$ select n from generate_series(1, 5) n where not public.sign_in_attempt('bdm@example.test') $$,
  'five attempts for one address are allowed');
select is(public.sign_in_attempt('bdm@example.test'), false, 'the sixth is refused');
select is(public.sign_in_attempt('  BDM@Example.TEST '), false, 'however the address is written');
select is(public.sign_in_attempt('recruiter@example.test'), true, 'another address is unaffected');
select is_empty(
  $$ select n from generate_series(1, 5) n where not public.sign_in_attempt('nobody-here@example.test') $$,
  'an address with no account is counted exactly the same');
select is(public.sign_in_attempt('nobody-here@example.test'), false,
  'and refused the same: the limit says nothing about which addresses have accounts');
select throws_ok($$ select count(*) from private.sign_in_attempts $$, '42501', null,
  'anon cannot read the ledger');
select tests.reset();
select is((select count(*) from private.sign_in_attempts where email_key = convert_to('bdm@example.test', 'UTF8')), 0::bigint,
  'and the address itself is never stored');

-- Reaching the second factor clears the count, and a password alone does not.
select tests.act_as('00000000-0000-4000-8000-000000000003', 'bdm@example.test', 'aal1');
select public.sign_in_succeeded();
select tests.reset();
select is((select count(*) from private.sign_in_attempts where email_key = private.sign_in_key('bdm@example.test')), 5::bigint,
  'sign_in_succeeded at aal1 clears nothing');
select tests.act_as('00000000-0000-4000-8000-000000000003', 'bdm@example.test', 'aal2');
select public.sign_in_succeeded();
select tests.reset();
select is((select count(*) from private.sign_in_attempts where email_key = private.sign_in_key('bdm@example.test')), 0::bigint,
  'at aal2 it clears that address');
select is((select count(*) from private.sign_in_attempts where email_key = private.sign_in_key('nobody-here@example.test')), 5::bigint,
  'and only that address');

-- Clearing a count on purpose (migration 15): the trusted backend only.
select tests.act_as(null, null, 'anon');
select throws_ok($$ select public.reset_sign_in_attempts('nobody-here@example.test') $$, '42501', null,
  'anon cannot clear a count');
select tests.reset();
select tests.act_as('00000000-0000-4000-8000-000000000001', 'super.admin@example.test', 'aal2');
select throws_ok($$ select public.reset_sign_in_attempts('nobody-here@example.test') $$, '42501', null,
  'nor can a signed-in super_admin: an operator does it in the SQL editor');
select tests.reset();
select is(public.reset_sign_in_attempts('  NOBODY-here@example.test'), 5,
  'the trusted backend clears it, however the address is written, and says how many');
select is((select count(*) from private.sign_in_attempts where email_key = private.sign_in_key('nobody-here@example.test')), 0::bigint,
  'and the address may sign in again');

select * from finish();
rollback;
