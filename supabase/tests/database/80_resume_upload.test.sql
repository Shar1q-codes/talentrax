-- The resume upload's two server-side steps (migration 17): issuing a slot
-- for a fresh intake row, and recording what the byte check found. One
-- transaction, rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.act_as(r text, uid uuid default null) returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.headers', '{}', true);
  if r is null then return; end if;
  perform set_config('request.jwt.claims', json_build_object('role', r, 'sub', uid, 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.role', r, true);
  if uid is not null then perform set_config('request.jwt.claim.sub', uid::text, true); end if;
  perform set_config('role', r, true);
end;
$$;
grant execute on function tests.act_as(text, uuid) to anon, authenticated, service_role;

-- An intake row as the form inserts it, from a fresh address each time.
create function tests.intake(key uuid, mime text, bytes bigint, n int) returns void
language plpgsql as $$
begin
  perform set_config('request.headers', json_build_object('cf-connecting-ip', '198.51.100.' || n)::text, true);
  insert into public.resume_submissions
    (full_name, email, consent_store, resume_filename, resume_mime_type, resume_size_bytes, submission_key, message)
  values ('Upload Test ' || n, 'upload' || n || '@uploads.example.test', true, 'cv.pdf', mime, bytes, key, 'upload test ' || n);
end;
$$;
grant execute on function tests.intake(uuid, text, bigint, int) to anon, authenticated, service_role;

delete from private.intake_events;

select tests.act_as('anon');
select tests.intake('00000000-0000-4000-8000-0000000c0001', 'application/pdf', 1000, 1);
select tests.intake('00000000-0000-4000-8000-0000000c0002', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2000, 2);
select tests.intake('00000000-0000-4000-8000-0000000c0003', 'image/png', 1000, 3);
select tests.intake('00000000-0000-4000-8000-0000000c0004', 'application/pdf', 6 * 1024 * 1024, 4);
select tests.intake('00000000-0000-4000-8000-0000000c0005', 'application/msword', 3000, 5);

-- Who may call them.
select throws_ok($$ select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0001') $$,
  '42501', null, 'anon cannot claim an upload slot');
select throws_ok($$ select public.record_resume_check('00000000-0000-4000-8000-0000000c0001', null) $$,
  '42501', null, 'anon cannot record a check');
select tests.act_as(null);
select tests.act_as('authenticated', '00000000-0000-4000-8000-000000000001');
select throws_ok($$ select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0001') $$,
  '42501', null, 'nor can a signed-in super_admin');
select throws_ok($$ select public.record_resume_check('00000000-0000-4000-8000-0000000c0001', null) $$,
  '42501', null, 'nor record one: only the upload endpoint says whether a file arrived');
select tests.act_as(null);

-- Claiming a slot.
select tests.act_as('service_role');
create temporary table claimed as
  select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0001');
select is((select state from claimed), 'upload', 'a fresh row gets a slot to upload into');
select ok((select storage_path from claimed) like
  (select id::text from public.resume_submissions where submission_key = '00000000-0000-4000-8000-0000000c0001') || '/%.pdf',
  'under the row''s own id, with the extension its declared type implies');
select isnt((select resume_upload_issued_at from public.resume_submissions where submission_key = '00000000-0000-4000-8000-0000000c0001'),
  null, 'and the row records that an upload was issued');
select is((select storage_path from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0001')),
  (select storage_path from claimed), 'a retry gets the same path, never a second one');
select ok((select storage_path from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0002')) like '%.docx',
  'a DOCX gets .docx');
select ok((select storage_path from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0005')) like '%.doc',
  'a DOC gets .doc');
select is_empty($$ select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0009') $$,
  'an unknown key gets nothing');
select is_empty($$ select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0003') $$,
  'a declared type the bucket refuses gets nothing');
select is_empty($$ select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0004') $$,
  'nor does a declared size over the bucket''s limit');
select tests.act_as(null);

-- A row older than fifteen minutes: inserted directly, with its own time.
insert into public.resume_submissions
  (full_name, email, consent_store, resume_filename, resume_mime_type, resume_size_bytes, submission_key, created_at)
values ('Upload Test Old', 'old@uploads.example.test', true, 'cv.pdf', 'application/pdf', 1000,
        '00000000-0000-4000-8000-0000000c0006', now() - interval '16 minutes');
select tests.act_as('service_role');
select is_empty($$ select * from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0006') $$,
  'a row more than fifteen minutes old gets nothing: a key found later is worth nothing');
select tests.act_as(null);

-- An object already at the path: straight to the check.
insert into storage.objects (bucket_id, name) select 'resume-intake', storage_path from claimed;
select tests.act_as('service_role');
select is((select state from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0001')), 'uploaded',
  'once the object is there, the slot says so, and no new URL is needed');

-- Recording the check.
select is(public.record_resume_check('00000000-0000-4000-8000-0000000c0009', null), null,
  'an unknown key records nothing');
select is(public.record_resume_check('00000000-0000-4000-8000-0000000c0001', null), 'received',
  'a file that passed is received');
select is((select state from public.claim_resume_upload('00000000-0000-4000-8000-0000000c0001')), 'received',
  'and a retry is told so');
select is(public.record_resume_check('00000000-0000-4000-8000-0000000c0001', 'signature_mismatch'), null,
  'a decided row cannot be decided again');

select is(public.record_resume_check('00000000-0000-4000-8000-0000000c0002', 'signature_mismatch'), 'rejected',
  'a file that failed is rejected');
select is((select resume_rejected_reason from public.resume_submissions where submission_key = '00000000-0000-4000-8000-0000000c0002'),
  'signature_mismatch', 'with its reason on the row');
select is((select count(*) from public.storage_erasures e
           where e.reason = 'rejected_upload' and e.bucket = 'resume-intake' and e.status = 'pending'
             and e.object_path = (select resume_storage_path from public.resume_submissions where submission_key = '00000000-0000-4000-8000-0000000c0002')),
  1::bigint, 'and the file queued for deletion in the same transaction');
select throws_ok($$ select public.record_resume_check('00000000-0000-4000-8000-0000000c0005', 'looks_odd') $$,
  '23514', null, 'only the three check results are accepted');

-- Checking later (migration 18): any age, for a row with a path.
select is((select state from public.resume_upload_for_check('00000000-0000-4000-8000-0000000c0005')), 'missing',
  'a row with a slot and nothing uploaded reads as missing');
select is((select state from public.resume_upload_for_check('00000000-0000-4000-8000-0000000c0002')), 'rejected',
  'a decided row reads as decided');
select tests.act_as(null);
select tests.act_as('anon');
select throws_ok($$ select * from public.resume_upload_for_check('00000000-0000-4000-8000-0000000c0005') $$,
  '42501', null, 'and only the service role may ask');
select tests.act_as(null);

select * from finish();
rollback;
