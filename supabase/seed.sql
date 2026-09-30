-- =============================================================================
-- LOCAL TESTING SEED. Never run against a hosted project.
--
-- One user per role, every one on the reserved .test domain, every password
-- `local-password-only`. Every business row is named "Test ..." or carries
-- DO-NOT-SHIP-FIXTURE, the same sentinel the site's own fixtures use, so one
-- grep finds any of it that ever escapes local development:
--
--   grep -r "DO-NOT-SHIP-FIXTURE" <anything>
--
-- The one job is is_test = true and a draft: it is not publicly visible and
-- could not be even if published, by the schema's own rule.
--
-- `supabase db reset` runs this after the migrations. It runs as the
-- migration role, which the workflow triggers treat as the trusted backend,
-- so the role assignments below go through without an admin session.
-- =============================================================================

-- ---------------------------------------------------------------- Users
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt('local-password-only', extensions.gen_salt('bf')),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('full_name', u.full_name),
  now(),
  now(),
  '', '', ''
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'super.admin@example.test',        'Test Super Admin'),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'platform.admin@example.test',     'Test Platform Admin'),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'bdm@example.test',                'Test BDM'),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'full.desk.recruiter@example.test','Test Full Desk Recruiter'),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'recruiter@example.test',          'Test Recruiter'),
  ('00000000-0000-4000-8000-000000000006'::uuid, 'research.analyst@example.test',   'Test Research Analyst'),
  ('00000000-0000-4000-8000-000000000007'::uuid, 'content.manager@example.test',    'Test Content Manager'),
  ('00000000-0000-4000-8000-000000000008'::uuid, 'marketing.manager@example.test',  'Test Marketing Manager'),
  ('00000000-0000-4000-8000-000000000009'::uuid, 'employer.user@example.test',      'Test Employer User'),
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'job.seeker@example.test',         'Test Job Seeker')
) as u(id, email, full_name);

-- Sign-in needs a confirmed email, empty (not NULL) token columns and an
-- identity row. Guarded, because the columns and auth.identities come from
-- the auth service's own migrations: `supabase start` has them, a bare
-- Postgres image does not.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
    update auth.users set email_confirmed_at = now() where email like '%@example.test';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_token_new') then
    update auth.users set email_change_token_new = '' where email like '%@example.test';
  end if;
  if to_regclass('auth.identities') is not null then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), u.id, u.id::text, 'email',
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           now(), now(), now()
    from auth.users u
    where u.email like '%@example.test';
  end if;
end;
$$;

-- ---------------------------------------------------------------- Employer
insert into public.employers (id, company_name, industry, size_band, city, state, owner_id, status, notes)
values ('00000000-0000-4000-8000-0000000000e1', 'Test Employer DO-NOT-SHIP-FIXTURE', 'Healthcare',
        '201-500', 'Testville', 'TX', '00000000-0000-4000-8000-000000000003', 'active',
        'Local seed data. Not a real company.');

insert into public.employer_contacts (employer_id, full_name, title, email, phone, is_primary)
values ('00000000-0000-4000-8000-0000000000e1', 'Test Hiring Contact', 'Test Title',
        'hiring.contact@example.test', '555-0100', true);

-- ---------------------------------------------------------------- Roles
update public.profiles set role = 'super_admin'         where id = '00000000-0000-4000-8000-000000000001';
update public.profiles set role = 'platform_admin'      where id = '00000000-0000-4000-8000-000000000002';
update public.profiles set role = 'bdm'                 where id = '00000000-0000-4000-8000-000000000003';
update public.profiles set role = 'full_desk_recruiter' where id = '00000000-0000-4000-8000-000000000004';
update public.profiles set role = 'recruiter'           where id = '00000000-0000-4000-8000-000000000005';
update public.profiles set role = 'research_analyst'    where id = '00000000-0000-4000-8000-000000000006';
update public.profiles set role = 'content_manager'     where id = '00000000-0000-4000-8000-000000000007';
update public.profiles set role = 'marketing_manager'   where id = '00000000-0000-4000-8000-000000000008';
update public.profiles set role = 'employer_user', employer_id = '00000000-0000-4000-8000-0000000000e1'
  where id = '00000000-0000-4000-8000-000000000009';
-- ...0a stays job_seeker, as every signup does.

-- ---------------------------------------------------------------- Pipeline
insert into public.leads (source, contact_name, contact_email, company_name, requested_service,
                          desk, specialty, city, state, positions, submitted_details, owner_id)
values ('website_form', 'Test Lead Contact', 'lead.contact@example.test',
        'Test Lead Company DO-NOT-SHIP-FIXTURE', 'contract', 'healthcare', 'nursing',
        'Testville', 'TX', 1, 'Local seed data.', '00000000-0000-4000-8000-000000000003');

insert into public.requisitions (id, employer_id, title, desk, specialty, engagement_type, work_mode,
                                 city, state, headcount, salary_min, salary_max, salary_unit,
                                 description, internal_notes, owner_id, status, opened_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000e1',
        'Test Registered Nurse DO-NOT-SHIP-FIXTURE', 'healthcare', 'nursing', 'contract', 'onsite',
        'Testville', 'TX', 1, 1, 2, 'hour',
        'Local seed data.', 'Internal note the employer must never see.',
        '00000000-0000-4000-8000-000000000003', 'open', now());

insert into public.requisition_assignments (requisition_id, recruiter_id) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000005');

insert into public.jobs (requisition_id, slug, title, desk, specialty, engagement_type, work_mode,
                         city, state, salary_min, salary_max, salary_unit, status, is_test)
values ('00000000-0000-4000-8000-0000000000a1', 'do-not-ship-fixture-test-registered-nurse',
        'DO-NOT-SHIP-FIXTURE Test Registered Nurse', 'healthcare', 'nursing', 'contract', 'onsite',
        'Testville', 'TX', 1, 2, 'hour', 'draft', true);

-- The job seeker's own record, and one candidate a recruiter sourced.
insert into public.candidates (id, profile_id, full_name, email, city, state, desk, specialty,
                               work_authorized, source, owner_id)
values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000000a',
   'Test Job Seeker', 'job.seeker@example.test', 'Testville', 'TX', 'healthcare', 'nursing',
   true, 'self_registered', null),
  ('00000000-0000-4000-8000-0000000000c2', null,
   'Test Sourced Candidate', 'sourced.candidate@example.test', 'Testville', 'TX', 'healthcare', 'nursing',
   true, 'sourced', '00000000-0000-4000-8000-000000000005');

insert into public.candidate_documents (id, candidate_id, kind, storage_path, original_filename,
                                        mime_type, size_bytes, uploaded_by, is_original)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c2', 'resume',
        'seed/do-not-ship-fixture/original.pdf', 'original.pdf', 'application/pdf', 1,
        '00000000-0000-4000-8000-000000000005', true);
insert into public.candidate_documents (candidate_id, kind, storage_path, original_filename,
                                        mime_type, size_bytes, uploaded_by, is_original,
                                        parent_document_id, version)
values ('00000000-0000-4000-8000-0000000000c2', 'resume',
        'seed/do-not-ship-fixture/scrubbed-v1.pdf', 'scrubbed-v1.pdf', 'application/pdf', 1,
        '00000000-0000-4000-8000-000000000005', false, '00000000-0000-4000-8000-0000000000d1', 1);

-- A submission waiting on the BDM: consented, not yet approved, not sent.
insert into public.submissions (candidate_id, requisition_id, submitted_by, candidate_consent_obtained, status)
values ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a1',
        '00000000-0000-4000-8000-000000000005', true, 'pending-bdm-review');
