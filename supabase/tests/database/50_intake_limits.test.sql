-- Rate limits on the three public forms (migration 9). One transaction,
-- rolled back; now() is fixed, so every submission here is in the same
-- window.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(35);

-- -----------------------------------------------------------------------------
-- Harness: submit a form as anon (or a signed-in user) from an address.
-- -----------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.act_as(r text, ip text, uid uuid default null) returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.headers', '', true);
  if r is null then return; end if;
  perform set_config('request.headers',
    case when ip is null then '{}' else json_build_object('cf-connecting-ip', ip)::text end, true);
  perform set_config('request.jwt.claims', json_build_object('role', r, 'sub', uid, 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.role', r, true);
  if uid is not null then perform set_config('request.jwt.claim.sub', uid::text, true); end if;
  perform set_config('role', r, true);
end;
$$;
grant execute on function tests.act_as(text, text, uuid) to anon, authenticated, service_role;

-- Returns 'ok', or the SQLSTATE; the last error's DETAIL is kept for inspection.
create table tests.last_error (detail text, message text);
grant all on tests.last_error to anon, authenticated, service_role;
create function tests.submit_as(r text, ip text, stmt text, uid uuid default null) returns text
language plpgsql as $$
declare
  result text := 'ok';
  d text;
  m text;
begin
  begin
    perform tests.act_as(r, ip, uid);
    execute stmt;
  exception when others then
    get stacked diagnostics d = pg_exception_detail, m = message_text;
    result := sqlstate;
    perform tests.act_as(null, null);
    delete from tests.last_error;
    insert into tests.last_error values (d, m);
  end;
  perform tests.act_as(null, null);
  return result;
end;
$$;
grant execute on function tests.submit_as(text, text, text, uuid) to anon, authenticated, service_role;

create function tests.contact(n int, key uuid default null) returns text
language sql as $$
  select format(
    $q$ insert into public.contact_messages (full_name, email, enquiry_type, subject, message, submission_key)
        values ('Test Person %s', 'person%s@limits.example.test', 'job-seeker', 'Subject %s', 'Message %s', %L) $q$,
    n, n, n, n, key)
$$;

select tests.act_as(null, null);

-- Start from an empty ledger. Every count below assumes it, and a local
-- database keeps real ledger rows for 48 hours: the @db browser suite leaves
-- some. The whole file is rolled back, so nothing outside it is lost.
delete from private.intake_events;

-- =============================================================================
-- 1. Per address: twenty an hour, then 429.
-- =============================================================================
select is_empty(
  $$ select n from generate_series(1, 20) n where tests.submit_as('anon', '198.51.100.1', tests.contact(n)) <> 'ok' $$,
  'twenty distinct contact messages from one address in an hour are all accepted');
select is(tests.submit_as('anon', '198.51.100.1', tests.contact(21)), 'PGRST',
  'the twenty-first is refused');
select is((select detail::json ->> 'status' from tests.last_error), '429', 'with HTTP 429');
select is((select detail::json -> 'headers' ->> 'Retry-After' from tests.last_error), '3600',
  'and a Retry-After of when the oldest counted submission leaves the window');
select is((select message::json ->> 'message' from tests.last_error), 'Too many submissions. Please wait and try again.',
  'the message says nothing about which limit, or why');
select is((select message::json ->> 'details' from tests.last_error), '3600',
  'and the body repeats the wait in details, which a cross-origin page can read when it cannot read the header');
select is((select count(*) from public.contact_messages where email like 'person%@limits.example.test'), 20::bigint,
  'the refused message was not stored');
select is(tests.submit_as('anon', '198.51.100.2', tests.contact(22)), 'ok', 'another address is unaffected');

-- =============================================================================
-- 2. A retry is never punished.
-- =============================================================================
select is(tests.submit_as('anon', '198.51.100.1', tests.contact(5)), 'ok',
  'resending an already-accepted message from an address at its limit succeeds');
select is((select count(*) from public.contact_messages where subject = 'Subject 5'), 1::bigint,
  'and stores nothing twice');

select is(tests.submit_as('anon', '198.51.100.3', tests.contact(30, '00000000-0000-4000-8000-00000000ab01')), 'ok',
  'a submission with a submission_key is accepted');
select is(tests.submit_as('anon', '198.51.100.3',
  $$ insert into public.contact_messages (full_name, email, enquiry_type, subject, message, submission_key)
     values ('Test Person 30', 'person30@limits.example.test', 'job-seeker', 'Subject 30', 'Message 30 (retyped)', '00000000-0000-4000-8000-00000000ab01') $$), 'ok',
  'its retry, even with the message retyped, succeeds');
select is((select count(*) from public.contact_messages where submission_key = '00000000-0000-4000-8000-00000000ab01'), 1::bigint,
  'and is the same one submission');

-- Retries do not count: an address with one real submission can retry it
-- twenty times and still send a second message.
select is_empty(
  $$ select n from generate_series(1, 20) n where tests.submit_as('anon', '198.51.100.4', tests.contact(40)) <> 'ok' $$,
  'twenty retries of one message are all accepted');
select is(tests.submit_as('anon', '198.51.100.4', tests.contact(41)), 'ok',
  'and did not use up the address''s limit');

-- =============================================================================
-- 3. IPv6 counts by /64; no trusted address means no per-address limit.
-- =============================================================================
select is_empty(
  $$ select n from generate_series(1, 20) n
     where tests.submit_as('anon', '2001:db8:1:2::' || to_hex(n), tests.contact(100 + n)) <> 'ok' $$,
  'twenty messages from twenty addresses in one IPv6 /64 are accepted');
select is(tests.submit_as('anon', '2001:db8:1:2:ffff:ffff:ffff:ffff', tests.contact(121)), 'PGRST',
  'the twenty-first from anywhere in that /64 is refused: one device can rotate through it');
select is(tests.submit_as('anon', '2001:db8:1:3::1', tests.contact(122)), 'ok', 'the next /64 is unaffected');

select is_empty(
  $$ select n from generate_series(1, 25) n where tests.submit_as('anon', null, tests.contact(200 + n)) <> 'ok' $$,
  'with no cf-connecting-ip, no per-address limit applies (the other headers are forgeable or the gateway''s own)');

-- =============================================================================
-- 4. Per email: held, never refused.
-- =============================================================================
create function tests.resume(n int, ip text) returns text
language sql as $$
  select tests.submit_as('anon', ip, format(
    $q$ insert into public.resume_submissions (full_name, email, consent_store, message)
        values ('Test Applicant', 'applicant@limits.example.test', true, 'Resume %s') $q$, n))
$$;
select is_empty(
  $$ select n from generate_series(1, 3) n where tests.resume(n, '203.0.113.' || n) <> 'ok' $$,
  'three distinct resumes from one email address are accepted');
select is(tests.resume(4, '203.0.113.4'), 'ok',
  'the fourth is accepted too: a 429 here would tell a stranger this person applied today');
select results_eq(
  $$ select message, held_at is not null from public.resume_submissions
     where email = 'applicant@limits.example.test' order by message $$,
  $$ values ('Resume 1', false), ('Resume 2', false), ('Resume 3', false), ('Resume 4', true) $$,
  'but it is held for staff review');
select is(tests.submit_as('anon', '203.0.113.9',
  $$ insert into public.contact_messages (full_name, email, enquiry_type, message, held_at) values ('X', 'x@limits.example.test', 'employer', 'x', null) $$),
  '42501', 'anon cannot set held_at');

-- =============================================================================
-- 5. The global ceiling.
-- =============================================================================
update public.intake_limits set max_submissions = 3 where form = 'leads' and scope = 'global';
create function tests.lead(n int) returns text
language sql as $$
  select tests.submit_as('anon', '192.0.2.' || n, format(
    $q$ insert into public.leads (source, contact_name, contact_email, company_name)
        values ('website_form', 'Test Contact %s', 'contact%s@limits.example.test', 'Example Prospect %s') $q$, n, n, n))
$$;
select is_empty($$ select n from generate_series(1, 3) n where tests.lead(n) <> 'ok' $$,
  'leads from three addresses fill a (lowered) global ceiling of three');
select is(tests.lead(4), 'PGRST', 'the fourth, from a fresh address, is refused: the ceiling is per form, not per address');
select is((select detail::json ->> 'status' from tests.last_error), '429', 'with HTTP 429');

-- =============================================================================
-- 5b. A repeated spam-trap trip is stored and held, never refused (migration 13).
-- =============================================================================
select is(tests.submit_as('anon', '198.51.100.50',
  $q$ insert into public.contact_messages (full_name, email, enquiry_type, subject, message, trap_tripped)
      values ('Trap Person', 'trap@limits.example.test', 'employer', 'S', 'tripped twice', true) $q$), 'ok',
  'a submission marked trap_tripped is accepted, not refused');
select is((select held_at is not null from public.contact_messages where message = 'tripped twice'), true,
  'and held for staff review');
select is(tests.submit_as('anon', '198.51.100.51',
  $q$ insert into public.contact_messages (full_name, email, enquiry_type, subject, message, trap_tripped)
      values ('Trap Person', 'trap-2@limits.example.test', 'employer', 'S', 'not tripped', false) $q$), 'ok',
  'an unmarked one from a fresh address is accepted');
select is((select held_at from public.contact_messages where message = 'not tripped'), null,
  'and not held');

-- =============================================================================
-- 6. Who is not limited, and what is kept.
-- =============================================================================
select is_empty(
  $$ select n from generate_series(1, 5) n
     where tests.submit_as(null, null, format($q$ insert into public.leads (source, contact_name, company_name) values ('research', 'Test Research %s', 'Example %s') $q$, n, n)) <> 'ok' $$,
  'the trusted backend is not limited');
select is((select count(*) from public.intake_limits), 9::bigint, 'nine limits: three forms, three scopes');
select is_empty(
  $$ select column_name from information_schema.columns
     where table_schema = 'private' and table_name = 'intake_events'
       and data_type in ('text', 'character varying', 'inet', 'jsonb') and column_name <> 'form' $$,
  'the ledger holds no address in readable form: only HMACs');
insert into private.intake_events (form, fingerprint, occurred_at) values ('contact_messages', '\x00', now() - interval '3 days');
select private.purge_intake_events();
select is((select count(*) from private.intake_events where occurred_at < now() - interval '48 hours'), 0::bigint,
  'the ledger forgets after 48 hours');
select ok(exists (select 1 from cron.job where jobname = 'purge-intake-events'), 'and pg_cron runs the purge');

select * from finish();
rollback;
