-- Storage buckets and policies (migration 8), and the orphan sweep.
-- Policies are tested where Storage enforces them: storage.objects, under
-- the caller's role and JWT, exactly as the Storage API queries it.
-- One transaction, rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(48);

-- -----------------------------------------------------------------------------
-- Harness
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
  if fixture is null then return; end if;
  if fixture in ('anon', 'service_role') then
    perform set_config('request.jwt.claims', json_build_object('role', fixture)::text, true);
    perform set_config('request.jwt.claim.role', fixture, true);
    perform set_config('role', fixture, true);
    return;
  end if;
  user_id := tests.id(fixture);
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end;
$$;
grant execute on function tests.act_as(text) to anon, authenticated, service_role;

-- Can this caller see this object? (A download or a signed URL needs exactly this.)
create function tests.sees(fixture text, b text, n text) returns boolean
language plpgsql as $$
declare
  found boolean;
begin
  perform tests.act_as(fixture);
  begin
    select exists (select 1 from storage.objects where bucket_id = b and name = n) into found;
  exception when insufficient_privilege then
    found := false;
  end;
  perform tests.act_as(null);
  return found;
end;
$$;
grant execute on function tests.sees(text, text, text) to anon, authenticated, service_role;

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

-- Rows changed by a statement run as someone.
create function tests.rows_as(fixture text, stmt text) returns integer
language plpgsql as $$
declare
  n integer;
begin
  perform tests.act_as(fixture);
  execute stmt;
  get diagnostics n = row_count;
  perform tests.act_as(null);
  return n;
end;
$$;
grant execute on function tests.rows_as(text, text) to anon, authenticated, service_role;

select tests.act_as(null);

-- -----------------------------------------------------------------------------
-- Fixtures. cA is js's own record, owned by rec, submitted to employer e1 with
-- a scrubbed copy. rec2 works another desk; emp2 is another employer.
-- -----------------------------------------------------------------------------
insert into tests.ids (name, id)
select n, gen_random_uuid() from unnest(array[
  'padmin', 'bdm', 'rec', 'rec2', 'emp', 'emp2', 'js', 'js2',
  'e1', 'e2', 'r1', 'cA', 'cB', 'dO', 'dS', 'dNew', 'dSelf', 'dScrubNew', 'rs', 's1'
]) as n;

insert into auth.users (id, email)
select tests.id(n), n || '@storage.example.test'
from unnest(array['padmin', 'bdm', 'rec', 'rec2', 'emp', 'emp2', 'js', 'js2']) as n;
insert into public.employers (id, company_name, owner_id, status) values
  (tests.id('e1'), 'Example Storage Employer One', tests.id('bdm'), 'active'),
  (tests.id('e2'), 'Example Storage Employer Two', tests.id('bdm'), 'active');
update public.profiles set role = 'platform_admin' where id = tests.id('padmin');
update public.profiles set role = 'bdm' where id = tests.id('bdm');
update public.profiles set role = 'recruiter' where id in (tests.id('rec'), tests.id('rec2'));
update public.profiles set role = 'employer_user', employer_id = tests.id('e1') where id = tests.id('emp');
update public.profiles set role = 'employer_user', employer_id = tests.id('e2') where id = tests.id('emp2');

insert into public.requisitions (id, employer_id, title, desk, specialty, engagement_type, owner_id, status)
values (tests.id('r1'), tests.id('e1'), 'Test Nurse', 'healthcare', 'nursing', 'direct-hire', tests.id('bdm'), 'open');
insert into public.candidates (id, profile_id, full_name, email, source, owner_id) values
  (tests.id('cA'), tests.id('js'), 'Test Storage Candidate', 'cA@storage.example.test', 'self_registered', tests.id('rec')),
  (tests.id('cB'), tests.id('js2'), 'Test Other Candidate', 'cB@storage.example.test', 'self_registered', null);
insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original) values
  (tests.id('dO'), tests.id('cA'), 'resume', 'cA/original.pdf', true);
insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original, parent_document_id, version) values
  (tests.id('dS'), tests.id('cA'), 'resume', 'cA/scrubbed-v1.pdf', false, tests.id('dO'), 1);
insert into public.submissions (id, candidate_id, requisition_id, submitted_by, candidate_consent_obtained,
                                bdm_decision, sent_to_employer_at, shared_document_id, status)
values (tests.id('s1'), tests.id('cA'), tests.id('r1'), tests.id('rec'), true, 'approved', now(), tests.id('dS'), 'sent-to-employer');
insert into public.resume_submissions (id, full_name, email, consent_store, resume_storage_path, owner_id)
values (tests.id('rs'), 'Test Intake', 'intake@storage.example.test', true, tests.id('rs')::text || '/resume.pdf', tests.id('rec'));

-- The objects, as the Storage API would have stored them.
insert into storage.objects (bucket_id, name) values
  ('candidate-originals', 'cA/original.pdf'),
  ('candidate-scrubbed', 'cA/scrubbed-v1.pdf'),
  ('resume-intake', tests.id('rs')::text || '/resume.pdf');

-- -----------------------------------------------------------------------------
-- 1. The buckets.
-- -----------------------------------------------------------------------------
select results_eq(
  $$ select id, public, file_size_limit, allowed_mime_types::text, coalesce(versioning_status, 'DISABLED')
     from storage.buckets where id in ('candidate-originals', 'candidate-scrubbed', 'resume-intake') order by id $$,
  $$ values
     ('candidate-originals', false, 5242880::bigint, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}', 'DISABLED'),
     ('candidate-scrubbed', false, 5242880::bigint, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}', 'DISABLED'),
     ('resume-intake', false, 5242880::bigint, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}', 'DISABLED') $$,
  'three private buckets, the form''s limits, versioning off (a versioned delete would keep the bytes)');
select is_empty(
  $$ select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'talentrax_%' and cmd in ('UPDATE', 'DELETE', 'ALL') $$,
  'no UPDATE or DELETE policy on objects: nobody overwrites, nobody but the worker deletes');
select is_empty(
  $$ select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'talentrax_%' and 'anon' = any (roles) $$,
  'anon has no storage policy at all');

-- -----------------------------------------------------------------------------
-- 2. Reading an original.
-- -----------------------------------------------------------------------------
select ok(tests.sees('js', 'candidate-originals', 'cA/original.pdf'), 'the candidate reads their own original');
select ok(tests.sees('rec', 'candidate-originals', 'cA/original.pdf'), 'the recruiter who manages them reads it');
select ok(tests.sees('padmin', 'candidate-originals', 'cA/original.pdf'), 'an administrator reads it');
select ok(not tests.sees('bdm', 'candidate-originals', 'cA/original.pdf'),
  'the BDM deciding on the submission does NOT read the original - they get the scrubbed copy');
select ok(not tests.sees('rec2', 'candidate-originals', 'cA/original.pdf'), 'another recruiter does not');
select ok(not tests.sees('emp', 'candidate-originals', 'cA/original.pdf'),
  'the employer the candidate was sent to does not, even with the exact path');
select ok(not tests.sees('js2', 'candidate-originals', 'cA/original.pdf'), 'another candidate does not');
select ok(not tests.sees('anon', 'candidate-originals', 'cA/original.pdf'), 'anon does not');

-- -----------------------------------------------------------------------------
-- 3. Reading a scrubbed copy, and guessing.
-- -----------------------------------------------------------------------------
select ok(tests.sees('emp', 'candidate-scrubbed', 'cA/scrubbed-v1.pdf'), 'the employer reads the scrubbed copy sent to them');
select ok(tests.sees('bdm', 'candidate-scrubbed', 'cA/scrubbed-v1.pdf'), 'the BDM reads it');
select ok(tests.sees('js', 'candidate-scrubbed', 'cA/scrubbed-v1.pdf'), 'the candidate reads it');
select ok(not tests.sees('emp2', 'candidate-scrubbed', 'cA/scrubbed-v1.pdf'), 'another employer does not');
select ok(not tests.sees('anon', 'candidate-scrubbed', 'cA/scrubbed-v1.pdf'), 'anon does not');
select ok(not tests.sees('emp', 'candidate-scrubbed', 'cA/original.pdf'),
  'guessing the original''s path in the scrubbed bucket finds nothing');
select is(tests.sqlstate_as('emp', $$ insert into storage.objects (bucket_id, name) values ('candidate-scrubbed', 'cA/original.pdf') $$), '42501',
  'and the employer cannot plant an object there either');

-- -----------------------------------------------------------------------------
-- 4. Intake.
-- -----------------------------------------------------------------------------
select ok(tests.sees('rec', 'resume-intake', tests.id('rs')::text || '/resume.pdf'), 'the recruiter the intake row is routed to reads its resume');
select ok(tests.sees('padmin', 'resume-intake', tests.id('rs')::text || '/resume.pdf'), 'an administrator reads it');
select ok(not tests.sees('rec2', 'resume-intake', tests.id('rs')::text || '/resume.pdf'), 'another recruiter does not');
select ok(not tests.sees('anon', 'resume-intake', tests.id('rs')::text || '/resume.pdf'), 'anon - who uploaded it - cannot read it back');
select is(tests.sqlstate_as('anon', $$ insert into storage.objects (bucket_id, name) values ('resume-intake', 'x/resume.pdf') $$), '42501',
  'anon cannot upload directly: intake uploads go through a server-minted signed URL');
select is(tests.sqlstate_as('anon', $$ insert into public.resume_submissions (full_name, email, consent_store, resume_storage_path) values ('A', 'a@storage.example.test', true, 'x/y.pdf') $$), '42501',
  'anon can no longer name a storage path on the intake row');
select throws_ok($$ insert into public.resume_submissions (full_name, email, consent_store, resume_storage_path) values ('A', 'a2@storage.example.test', true, 'someone-else/resume.pdf') $$,
  '23514', null, 'an intake row''s path must sit under its own id, whoever writes it');

-- -----------------------------------------------------------------------------
-- 5. Uploading: only to a path a row names, only once.
-- -----------------------------------------------------------------------------
insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original) values
  (tests.id('dNew'), tests.id('cA'), 'certification', 'cA/new.pdf', true),
  (tests.id('dSelf'), tests.id('cA'), 'cover_letter', 'cA/self.pdf', true);
insert into public.candidate_documents (id, candidate_id, kind, storage_path, is_original, parent_document_id, version) values
  (tests.id('dScrubNew'), tests.id('cA'), 'resume', 'cA/scrubbed-v2.pdf', false, tests.id('dO'), 2);

select is(tests.sqlstate_as('rec', $$ insert into storage.objects (bucket_id, name) values ('candidate-originals', 'cA/new.pdf') $$), 'ok',
  'the managing recruiter uploads an original to the path its row names');
select is(tests.sqlstate_as('js', $$ insert into storage.objects (bucket_id, name) values ('candidate-originals', 'cA/self.pdf') $$), 'ok',
  'the candidate uploads their own original');
select is(tests.sqlstate_as('rec', $$ insert into storage.objects (bucket_id, name) values ('candidate-originals', 'cA/unnamed.pdf') $$), '42501',
  'no row names the path: refused');
select is(tests.sqlstate_as('rec', $$ insert into storage.objects (bucket_id, name) values ('candidate-scrubbed', 'cA/new.pdf') $$), '42501',
  'an original''s path in the scrubbed bucket: refused (the row says original)');
select is(tests.sqlstate_as('js', $$ insert into storage.objects (bucket_id, name) values ('candidate-scrubbed', 'cA/scrubbed-v2.pdf') $$), '42501',
  'a candidate cannot upload a scrubbed copy: that is staff work');
select is(tests.sqlstate_as('rec', $$ insert into storage.objects (bucket_id, name) values ('candidate-scrubbed', 'cA/scrubbed-v2.pdf') $$), 'ok',
  'the managing recruiter uploads the scrubbed copy');
select is(tests.sqlstate_as('bdm', $$ insert into storage.objects (bucket_id, name) values ('candidate-originals', 'cA/self.pdf') $$), '42501',
  'a BDM cannot upload an original');
select is(tests.sqlstate_as('emp', $$ insert into storage.objects (bucket_id, name) values ('candidate-originals', 'cA/new.pdf') $$), '42501',
  'an employer cannot upload anything');

-- Overwrite and delete.
select is(tests.rows_as('rec', $$ update storage.objects set metadata = '{"replaced": true}' where bucket_id = 'candidate-originals' and name = 'cA/original.pdf' $$), 0,
  'the managing recruiter cannot overwrite an original (no UPDATE policy: an upsert is refused)');
select is(tests.rows_as('padmin', $$ update storage.objects set metadata = '{"replaced": true}' where bucket_id = 'candidate-scrubbed' and name = 'cA/scrubbed-v1.pdf' $$), 0,
  'nor can an administrator overwrite a scrubbed copy');
select is(tests.sqlstate_as('padmin', $$ delete from storage.objects where bucket_id = 'candidate-originals' $$), '42501',
  'nobody deletes through the API roles, not even an administrator');

-- -----------------------------------------------------------------------------
-- 5b. Soft delete makes the bytes unreadable to staff, and does not make them
--     an orphan (checked with the sweep, below).
-- -----------------------------------------------------------------------------
update public.candidate_documents set deleted_at = now() where id = tests.id('dNew');
select ok(not tests.sees('rec', 'candidate-originals', 'cA/new.pdf'), 'a soft-deleted document''s object is unreadable');
-- -----------------------------------------------------------------------------
-- 6. A restricted candidate (an accepted deletion request).
-- -----------------------------------------------------------------------------
select tests.act_as('padmin');
select public.record_deletion_request(tests.id('cA'), 'email');
select public.accept_deletion_request(
  (select id from public.deletion_requests where candidate_id = tests.id('cA')), 'email_confirmation', now() + interval '30 days');
select tests.act_as(null);

select ok(not tests.sees('rec', 'candidate-originals', 'cA/original.pdf'),
  'restricted: the recruiter can no longer read the original');
select ok(not tests.sees('emp', 'candidate-scrubbed', 'cA/scrubbed-v1.pdf'),
  'restricted: the employer can no longer read the copy they were sent');
select ok(tests.sees('js', 'candidate-originals', 'cA/original.pdf') and tests.sees('padmin', 'candidate-originals', 'cA/original.pdf'),
  'restricted: the candidate and administrators still can');
select is(tests.sqlstate_as('js', $$ insert into storage.objects (bucket_id, name) values ('candidate-originals', 'cA/self-again.pdf') $$), '42501',
  'restricted: nothing new can be uploaded, even by the candidate');

-- -----------------------------------------------------------------------------
-- 7. The orphan sweep.
-- -----------------------------------------------------------------------------
-- An old object nothing names; a fresh one (maybe its row has not committed
-- yet); a named object of the restricted candidate uploaded BEFORE the
-- restriction; and one whose upload completed AFTER it.
insert into storage.objects (bucket_id, name, created_at) values
  ('candidate-originals', 'stray/old.pdf', now() - interval '2 hours'),
  ('candidate-scrubbed', 'stray/fresh.pdf', now() - interval '5 minutes');
update storage.objects set created_at = now() - interval '1 day'
 where bucket_id = 'candidate-originals' and name = 'cA/original.pdf';
insert into storage.objects (bucket_id, name, created_at)
values ('candidate-originals', 'cA/late.pdf', now() + interval '1 second');
-- The row for the late upload existed before the restriction began.
alter table public.candidate_documents disable trigger refuse_if_restricted;
insert into public.candidate_documents (candidate_id, kind, storage_path, is_original, created_at)
values (tests.id('cA'), 'other', 'cA/late.pdf', true, now() - interval '1 day');
alter table public.candidate_documents enable trigger refuse_if_restricted;

select is(tests.sqlstate_as('padmin', $$ select public.sweep_orphaned_storage_objects() $$), '42501',
  'the sweep is not callable by an administrator');
select tests.act_as('service_role');
select public.sweep_orphaned_storage_objects();
select tests.act_as(null);

select results_eq(
  $$ select bucket, object_path, reason from public.storage_erasures
     where reason in ('orphan', 'post_restriction') order by object_path $$,
  $$ values ('candidate-originals', 'cA/late.pdf', 'post_restriction'),
            ('candidate-originals', 'stray/old.pdf', 'orphan') $$,
  'the sweep queues the old orphan and the upload that completed after the restriction began, and nothing else');
select ok(not exists (select 1 from public.storage_erasures where object_path = 'stray/fresh.pdf'),
  'a fresh orphan inside the grace period is left alone (its row may not have committed)');
select ok(not exists (select 1 from public.storage_erasures where object_path in ('cA/original.pdf', 'cA/scrubbed-v1.pdf')),
  'the restricted candidate''s records from before the restriction are kept for the retention floor');
select tests.act_as('service_role');
select public.sweep_orphaned_storage_objects();
select tests.act_as(null);
select is((select count(*) from public.storage_erasures where reason in ('orphan', 'post_restriction')), 2::bigint,
  'running the sweep again queues nothing twice');
select ok(exists (select 1 from cron.job where jobname = 'sweep-orphaned-storage'), 'pg_cron runs the sweep hourly');

-- The soft-deleted document, swept with no grace at all: still not queued.
select tests.act_as('service_role');
select public.sweep_orphaned_storage_objects(interval '0');
select tests.act_as(null);
select ok(not exists (select 1 from public.storage_erasures where object_path = 'cA/new.pdf'),
  'but it is not swept: soft delete is reversible, erasure is what removes bytes');

select * from finish();
rollback;
