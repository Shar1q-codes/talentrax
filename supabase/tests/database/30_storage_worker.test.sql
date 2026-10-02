-- The storage worker's queue (migration 7): leases, outcomes, backoff, and
-- the database - not the Storage API's response - deciding what happened.
-- One transaction, rolled back.
--
-- The Storage API deletes an object by deleting its storage.objects row
-- with storage.allow_delete_query set; the tests do the same to stand in for
-- a successful API call.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(31);

-- Start from an empty outbox. Every count below assumes it, and a local
-- database keeps real rows: the @db browser suite's rejected upload queues
-- one, and locally no worker drains it. The whole file is rolled back, so
-- nothing outside it is lost.
delete from public.storage_erasures;

-- Harness: become service_role or an authenticated user, as PostgREST would.
create schema tests;
grant usage on schema tests to authenticated, service_role;
create function tests.act_as(r text, uid uuid default null) returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  if r is null then return; end if;
  perform set_config('request.jwt.claims', json_build_object('role', r, 'sub', uid, 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.role', r, true);
  if uid is not null then perform set_config('request.jwt.claim.sub', uid::text, true); end if;
  perform set_config('role', r, true);
end;
$$;
grant execute on function tests.act_as(text, uuid) to authenticated, service_role;

create function tests.sqlstate_as(r text, uid uuid, stmt text) returns text
language plpgsql as $$
declare result text := 'ok';
begin
  begin
    perform tests.act_as(r, uid);
    execute stmt;
  exception when others then
    result := sqlstate;
  end;
  perform tests.act_as(null);
  return result;
end;
$$;
grant execute on function tests.sqlstate_as(text, uuid, text) to authenticated, service_role;

-- The Storage API's delete, as the API performs it.
create function tests.storage_delete(b text, n text) returns void
language plpgsql as $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id = b and name = n;
  perform set_config('storage.allow_delete_query', 'false', true);
end;
$$;

-- Claim as service_role and keep the result where the tests can read it.
create table tests.claims (id uuid, bucket text, object_path text, claim_token uuid, present boolean, run int);
grant all on tests.claims to service_role;
create function tests.claim(n int, run_no int) returns int
language plpgsql as $$
declare c int;
begin
  perform tests.act_as('service_role');
  insert into tests.claims select x.*, run_no from public.claim_storage_erasures(n) x;
  get diagnostics c = row_count;
  perform tests.act_as(null);
  return c;
end;
$$;
create function tests.token(p text) returns uuid
language sql as $$ select claim_token from tests.claims where object_path = p order by run desc limit 1 $$;
create function tests.complete(p text, token uuid default null) returns text
language plpgsql as $$
declare r text; target uuid;
begin
  select id into target from public.storage_erasures where object_path = p;
  perform tests.act_as('service_role');
  r := public.complete_storage_erasure(target, coalesce(token, tests.token(p)));
  perform tests.act_as(null);
  return r;
end;
$$;
create function tests.fail(p text, code text) returns text
language plpgsql as $$
declare r text; target uuid;
begin
  select id into target from public.storage_erasures where object_path = p;
  perform tests.act_as('service_role');
  r := public.fail_storage_erasure(target, tests.token(p), code);
  perform tests.act_as(null);
  return r;
end;
$$;

-- Fixtures. Buckets as migration 8 creates them (no-op once it has).
insert into storage.buckets (id, name, public) values
  ('candidate-originals', 'candidate-originals', false),
  ('candidate-scrubbed', 'candidate-scrubbed', false),
  ('resume-intake', 'resume-intake', false)
on conflict (id) do nothing;

-- Objects that exist.
insert into storage.objects (bucket_id, name) values
  ('candidate-originals', 'w/present.pdf'),
  ('candidate-scrubbed', 'w/still-there.pdf'),
  ('candidate-originals', 'w/flaky.pdf');

-- Queue rows. 'orphan' needs no deletion request, which keeps this file
-- about the queue alone.
insert into public.storage_erasures (reason, bucket, object_path) values
  ('orphan', 'candidate-originals', 'w/present.pdf'),
  ('orphan', 'candidate-originals', 'w/never-existed.pdf'),
  ('orphan', 'candidate-scrubbed', 'w/still-there.pdf'),
  ('orphan', 'candidate-originals', 'w/flaky.pdf');

-- -----------------------------------------------------------------------------
-- Who may drive the queue.
-- -----------------------------------------------------------------------------
select is(tests.sqlstate_as('authenticated', gen_random_uuid(), $$ select * from public.claim_storage_erasures() $$), '42501',
  'an authenticated user cannot claim from the queue');
select is(tests.sqlstate_as('anon', null, $$ select * from public.claim_storage_erasures() $$), '42501',
  'nor can anon');
select is(tests.sqlstate_as('authenticated', gen_random_uuid(), $$ select public.complete_storage_erasure(gen_random_uuid(), gen_random_uuid()) $$), '42501',
  'nor complete a row');

-- -----------------------------------------------------------------------------
-- Claiming, and two workers at once.
-- -----------------------------------------------------------------------------
select is(tests.claim(10, 1), 4, 'the worker claims every due row');
select ok((select bool_and(claim_token is not null) from tests.claims where run = 1),
  'each claimed row carries a claim token');
select results_eq(
  $$ select object_path, present from tests.claims where run = 1 order by object_path $$,
  $$ values ('w/flaky.pdf', true), ('w/never-existed.pdf', false), ('w/present.pdf', true), ('w/still-there.pdf', true) $$,
  'the claim says, from storage.objects, which objects exist');
select is(tests.claim(10, 2), 0,
  'a second worker running at the same moment gets nothing: the rows are leased');

-- -----------------------------------------------------------------------------
-- Outcomes. The database checks; the worker's word is not enough.
-- -----------------------------------------------------------------------------
select tests.storage_delete('candidate-originals', 'w/present.pdf');
select is(tests.complete('w/present.pdf'), 'deleted', 'present when claimed, gone when completed: deleted');
select ok((select status = 'done' and outcome = 'deleted' and object_path is null and last_error_state is null
           from public.storage_erasures where reason = 'orphan' and outcome = 'deleted'),
  'the row is done, records how, and no longer holds the path');

select is(tests.complete('w/never-existed.pdf'), 'already_absent',
  'absent when claimed: already absent, which is success');
select is((select outcome from public.storage_erasures where outcome = 'already_absent'), 'already_absent',
  '"already gone" survives in the row, distinct from "deleted"');

select is(tests.complete('w/still-there.pdf'), 'still_present',
  'the worker says done, but the object is still in storage.objects: refused');
select ok((select status = 'pending' and outcome is null and last_error_state = 'still_present'
                  and next_attempt_at > now() and claim_token is null
           from public.storage_erasures where object_path = 'w/still-there.pdf'),
  'still pending, with the error recorded and a retry scheduled');

select is(tests.complete('w/present.pdf', gen_random_uuid()), 'stale',
  'completing a finished row is a no-op');

-- -----------------------------------------------------------------------------
-- Failure: backoff, never blocking, never abandoned, always visible.
-- -----------------------------------------------------------------------------
select is(tests.fail('w/flaky.pdf', 'http_503'), 'failed', 'an unreachable Storage API is a failure');
select ok((select status = 'pending' and outcome is null and last_error_state = 'http_503'
                  and next_attempt_at = now() + interval '2 minutes' and needs_attention_at is null
           from public.storage_erasures where object_path = 'w/flaky.pdf'),
  '"could not reach it": pending, an error code, no outcome, retried after a backoff');
select is(tests.fail('w/flaky.pdf', 'http_503'), 'stale',
  'a second report on the same claim is ignored');

-- A stale worker cannot overwrite a newer claim's result.
update public.storage_erasures set next_attempt_at = now() where object_path = 'w/flaky.pdf';
select is(tests.claim(1, 3), 1, 'the row comes due again and is reclaimed');
select is(public.fail_storage_erasure(
            (select id from public.storage_erasures where object_path = 'w/flaky.pdf'),
            (select claim_token from tests.claims where object_path = 'w/flaky.pdf' and run = 1), 'network'),
  'stale', 'the first worker''s late report, on its expired token, changes nothing');

-- A failing row does not block the queue.
insert into public.storage_erasures (reason, bucket, object_path) values ('orphan', 'resume-intake', 'w/later.pdf');
select is(tests.claim(1, 4), 1, 'with the failing row backing off, the next row is claimed');
select is((select object_path from tests.claims where run = 4), 'w/later.pdf', 'and it is the healthy one');

-- Eight attempts in, a human is told; the retries go on.
update public.storage_erasures set attempts = 8, next_attempt_at = now() where object_path = 'w/flaky.pdf';
select tests.claim(1, 5);
select tests.fail('w/flaky.pdf', 'http_503');
select ok((select needs_attention_at is not null and status = 'pending'
                  and next_attempt_at = now() + interval '6 hours'
           from public.storage_erasures where object_path = 'w/flaky.pdf'),
  'after eight attempts it is flagged for attention, still pending, retried every six hours at most');
select ok((select needs_attention = 1 and pending >= 2 from public.storage_erasure_backlog()),
  'storage_erasure_backlog() shows it');
select throws_ok($$ select private.assert_storage_erasures_healthy() $$, 'P0001', null,
  'the hourly health check fails while anything needs attention, so the cron run shows as failed');

-- -----------------------------------------------------------------------------
-- A bucket that does not exist is never "already absent".
-- -----------------------------------------------------------------------------
-- The bucket must be empty to go, and a local one holds the @db suite's
-- uploads. Their rows go first: all of it rolls back with the file, and no
-- bytes are touched (Storage keeps them; only its records are rolled back).
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'resume-intake';
delete from storage.buckets where id = 'resume-intake';
select set_config('storage.allow_delete_query', 'false', true);
update public.storage_erasures set next_attempt_at = now() where object_path = 'w/later.pdf';
select is(tests.claim(10, 6), 0, 'a row whose bucket is missing is not handed to the worker');
select ok((select last_error_state = 'bucket_missing' and status = 'pending' and outcome is null
           from public.storage_erasures where object_path = 'w/later.pdf'),
  'it fails with bucket_missing - the Storage API would have answered 200 [] for it');

-- -----------------------------------------------------------------------------
-- The constraint that keeps outcomes and errors apart.
-- -----------------------------------------------------------------------------
select throws_ok($$ insert into public.storage_erasures (reason, bucket, object_path, outcome) values ('orphan', 'candidate-originals', 'w/x.pdf', 'deleted') $$,
  '23514', null, 'a pending row cannot carry an outcome');
select throws_ok($$ insert into public.storage_erasures (reason, bucket, object_path) values ('orphan', 'candidate-originals', 'w/flaky.pdf') $$,
  '23505', null, 'the same object cannot be queued twice while pending');
select throws_ok($$ insert into public.storage_erasures (reason, bucket, object_path) values ('erasure', 'candidate-originals', 'w/y.pdf') $$,
  '23514', null, 'an erasure row must name its deletion request');

-- -----------------------------------------------------------------------------
-- Scheduling.
-- -----------------------------------------------------------------------------
select ok((select count(*) = 2 from cron.job where jobname in ('invoke-storage-worker', 'check-storage-erasures')),
  'pg_cron calls the worker and checks the backlog');
select lives_ok($$ select private.invoke_storage_worker() $$,
  'with no Vault secrets set (local), invoking the worker is a silent no-op');

select * from finish();
rollback;
