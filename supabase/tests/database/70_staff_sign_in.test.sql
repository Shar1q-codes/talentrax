-- Staff need the second factor (migration 14), and sign-in attempts are
-- delayed, one at a time per address (migration 16). One transaction,
-- rolled back; now() is fixed, so every attempt here is in the same window.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

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

-- Start from an empty ledger: a local database keeps real failures for a day.
delete from private.sign_in_failures;
delete from private.sign_in_leases;

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
-- B. The sign-in delay (migration 16): failures counted, a growing delay
--    with a ceiling, one attempt per address at a time, no lockout.
-- =============================================================================

-- One failed attempt for an address, as the sign-in page makes it: begin,
-- (wait), try, report a failure. Returns the delay it was given.
create function tests.fail_once(email text) returns integer
language plpgsql as $$
declare
  lease jsonb := public.sign_in_begin(email);
begin
  perform public.sign_in_end(email, (lease ->> 'token')::uuid, true);
  return (lease ->> 'delay_ms')::integer;
end;
$$;
grant execute on function tests.fail_once(text) to anon, authenticated, service_role;

select tests.act_as(null, null, 'anon');
select is(
  (select array_agg(tests.fail_once('bdm@example.test') order by n) from generate_series(1, 9) n),
  array[0, 0, 0, 1000, 2000, 4000, 8000, 10000, 10000],
  'three free failures, then 1, 2, 4 and 8 seconds, then the ten-second ceiling');
select is(
  (select max(tests.fail_once('bdm@example.test')) from generate_series(1, 20) n), 10000,
  'twenty more failures later, still ten seconds: a request never waits longer');
select is((public.sign_in_begin('  BDM@Example.TEST ') ->> 'delay_ms')::integer, 10000,
  'however the address is written');
select tests.reset();
delete from private.sign_in_leases;

-- The right password is never refused for the count: the attempt is still
-- offered, after its delay.
select tests.act_as(null, null, 'anon');
select isnt(public.sign_in_begin('bdm@example.test'), null,
  'after 29 failures an attempt is still offered: there is no lockout');

-- One attempt per address at a time.
select is(public.sign_in_begin('bdm@example.test'), null,
  'a second attempt while one is in progress is refused at once');
select isnt(public.sign_in_begin('recruiter@example.test'), null,
  'another address is unaffected');
select tests.reset();

create table tests.lease (token uuid);
grant all on tests.lease to anon, authenticated, service_role;
delete from private.sign_in_leases;
select tests.act_as(null, null, 'anon');
insert into tests.lease select (public.sign_in_begin('bdm@example.test') ->> 'token')::uuid;
select public.sign_in_end('bdm@example.test', gen_random_uuid(), false);
select is(public.sign_in_begin('bdm@example.test'), null,
  'reporting with a token that does not hold the lease releases nothing');
select public.sign_in_end('bdm@example.test', (select token from tests.lease), false);
select isnt(public.sign_in_begin('bdm@example.test'), null,
  'the holder reporting back releases it');
select tests.reset();

update private.sign_in_leases set held_until = now() - interval '1 second';
select tests.act_as(null, null, 'anon');
select isnt(public.sign_in_begin('bdm@example.test'), null,
  'a lease whose time is up lapses by itself: a crashed request holds nothing');
select tests.reset();
select is((select count(*) from private.sign_in_failures where email_key = private.sign_in_key('bdm@example.test')), 29::bigint,
  'reports of success counted nothing: only failures are counted');

select tests.act_as(null, null, 'anon');
select is(
  (select array_agg(tests.fail_once('nobody-here@example.test') order by n) from generate_series(1, 5) n),
  array[0, 0, 0, 1000, 2000],
  'an address with no account is delayed exactly the same: the delay says nothing about which addresses have accounts');
select is(public.sign_in_begin(''), null, 'an empty address is refused');
select throws_ok($$ select count(*) from private.sign_in_failures $$, '42501', null,
  'anon cannot read the failures');
select throws_ok($$ select count(*) from private.sign_in_leases $$, '42501', null,
  'or the leases');
select tests.reset();
select is((select count(*) from private.sign_in_failures where email_key = convert_to('bdm@example.test', 'UTF8')), 0::bigint,
  'and the address itself is never stored');

-- Passing the second factor clears the count; a password alone does not.
select tests.act_as('00000000-0000-4000-8000-000000000003', 'bdm@example.test', 'aal1');
select public.sign_in_succeeded();
select tests.reset();
select is((select count(*) from private.sign_in_failures where email_key = private.sign_in_key('bdm@example.test')), 29::bigint,
  'sign_in_succeeded at aal1 clears nothing');
select tests.act_as('00000000-0000-4000-8000-000000000003', 'bdm@example.test', 'aal2');
select public.sign_in_succeeded();
select tests.reset();
select is((select count(*) from private.sign_in_failures where email_key = private.sign_in_key('bdm@example.test')), 0::bigint,
  'at aal2 it clears that address');
select is((select count(*) from private.sign_in_failures where email_key = private.sign_in_key('nobody-here@example.test')), 5::bigint,
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
select public.sign_in_begin('nobody-here@example.test');
select is(public.reset_sign_in_attempts('  NOBODY-here@example.test'), 5,
  'the trusted backend clears it, however the address is written, and says how many');
select is((select count(*) from private.sign_in_failures where email_key = private.sign_in_key('nobody-here@example.test'))
        + (select count(*) from private.sign_in_leases where email_key = private.sign_in_key('nobody-here@example.test')), 0::bigint,
  'failures and any lease alike');

select * from finish();
rollback;
