-- =============================================================================
-- 5. ROW LEVEL SECURITY
--
-- RLS is on for every table, taxonomy included. Every policy reads identity
-- and role through the private helpers; none inlines a role lookup.
--
-- How it fits together:
--   * Visibility of each core entity is defined ONCE, in a private.can_*
--     function below. The entity's own policy and every child table's policy
--     call the same function, so "who can see a candidate" has one answer.
--   * DELETE is never permitted. There is no DELETE policy on any table, and
--     the privilege itself is revoked below. Removal is soft: set deleted_at.
--   * A RESTRICTIVE policy on every soft-deletable table hides deleted rows
--     from everyone but administrators and freezes them against edits.
--   * Field-level workflow rules that RLS cannot express (who may SEND a
--     submission, who may change a role) are triggers in migrations 1 and 3.
--   * anon: INSERT on the three public-form tables and nothing else. No
--     SELECT anywhere - not even taxonomy or published jobs. The public site
--     reads through a server-side key, never the anon key.
--   * employer_user reads nothing from base tables. Employers get three
--     column-restricted views instead, because RLS filters rows, not columns,
--     and a requisition's internal_notes or a candidate's phone number must
--     not be one select * away.
--
-- Wrapping zero-argument helpers as (select private.fn()) lets Postgres
-- evaluate them once per statement instead of once per row.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER, so policies on one table can consult
-- another without recursing through that table's own policies.
-- -----------------------------------------------------------------------------

-- The caller is the requisition's owner or a live assignee on it.
create function private.is_on_requisition(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requisitions r
    where r.id = target
      and r.deleted_at is null
      and (
        r.owner_id = private.current_profile_id()
        or exists (
          select 1 from public.requisition_assignments a
          where a.requisition_id = r.id
            and a.recruiter_id = private.current_profile_id()
            and a.deleted_at is null
        )
      )
  )
$$;

-- Employers: admins and research analysts see all; BDMs and recruiters see
-- the ones they own or hold a requisition on.
create function private.can_read_employer(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or private.has_role('research_analyst')
      or (
        private.has_role('bdm', 'full_desk_recruiter', 'recruiter')
        and (
          exists (
            select 1 from public.employers e
            where e.id = target and e.owner_id = private.current_profile_id()
          )
          or exists (
            select 1 from public.requisitions r
            where r.employer_id = target
              and r.deleted_at is null
              and private.is_on_requisition(r.id)
          )
        )
      )
$$;

create function private.can_write_employer(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or private.has_role('research_analyst')
      or (
        private.has_role('bdm')
        and exists (
          select 1 from public.employers e
          where e.id = target and e.owner_id = private.current_profile_id()
        )
      )
$$;

-- Requisitions: owner, assignees, and the BDM who owns the employer.
create function private.can_read_requisition(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or (
        private.has_role('bdm', 'full_desk_recruiter', 'recruiter')
        and (
          private.is_on_requisition(target)
          or (
            private.has_role('bdm')
            and exists (
              select 1 from public.requisitions r
              join public.employers e on e.id = r.employer_id
              where r.id = target and e.owner_id = private.current_profile_id()
            )
          )
        )
      )
$$;

-- Managing a requisition (editing it, its jobs, its assignees) is the BDM's.
create function private.can_manage_requisition(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or (
        private.has_role('bdm')
        and exists (
          select 1 from public.requisitions r
          join public.employers e on e.id = r.employer_id
          where r.id = target
            and r.deleted_at is null
            and (r.owner_id = private.current_profile_id()
                 or e.owner_id = private.current_profile_id())
        )
      )
$$;

-- The caller's own candidate record.
create function private.is_self_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select target is not distinct from private.current_candidate_id()
     and target is not null
$$;

-- Candidates a recruiter works: assigned to them, submitted by them, or
-- applicants to a job on a requisition they are on.
create function private.can_manage_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or (
        private.has_role('recruiter', 'full_desk_recruiter')
        and (
          exists (
            select 1 from public.candidates c
            where c.id = target and c.owner_id = private.current_profile_id()
          )
          or exists (
            select 1 from public.submissions s
            where s.candidate_id = target
              and s.submitted_by = private.current_profile_id()
              and s.deleted_at is null
          )
          or exists (
            select 1 from public.applications a
            join public.jobs j on j.id = a.job_id
            where a.candidate_id = target
              and a.deleted_at is null
              and private.is_on_requisition(j.requisition_id)
          )
        )
      )
$$;

-- Staff visibility of a candidate: those who manage them, plus the BDM
-- deciding on a submission of them. Read-only for the BDM.
create function private.staff_can_read_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.can_manage_candidate(target)
      or (
        private.has_role('bdm')
        and exists (
          select 1 from public.submissions s
          where s.candidate_id = target
            and s.deleted_at is null
            and (s.bdm_id = private.current_profile_id()
                 or private.can_manage_requisition(s.requisition_id))
        )
      )
$$;

create function private.can_read_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_self_candidate(target) or private.staff_can_read_candidate(target)
$$;

-- Submissions: the recruiter who made it, the BDM deciding on it, the BDM
-- managing the requisition, and admins. Employers only via the views.
create function private.can_read_submission(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or exists (
        select 1 from public.submissions s
        where s.id = target
          and s.deleted_at is null
          and (
            (private.has_role('recruiter', 'full_desk_recruiter')
             and s.submitted_by = private.current_profile_id())
            or (private.has_role('bdm')
                and (s.bdm_id = private.current_profile_id()
                     or private.can_manage_requisition(s.requisition_id)))
          )
      )
$$;

-- A job a candidate may apply to right now.
create function private.job_accepts_applications(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = target
      and private.job_is_public(j.status, j.is_test, j.published_at, j.expires_at, j.deleted_at)
  )
$$;

-- An activity inherits the visibility of whatever it is about.
create function private.can_read_subject(subject_type text, subject_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case subject_type
    when 'employer' then private.can_read_employer(subject_id)
    when 'employer_contact' then private.can_read_employer(
      (select c.employer_id from public.employer_contacts c where c.id = subject_id))
    when 'lead' then private.is_admin() or private.has_role('research_analyst')
      or exists (select 1 from public.leads l
                 where l.id = subject_id and l.owner_id = private.current_profile_id()
                   and private.has_role('bdm', 'full_desk_recruiter'))
    when 'requisition' then private.can_read_requisition(subject_id)
    when 'job' then private.can_read_requisition(
      (select j.requisition_id from public.jobs j where j.id = subject_id))
    when 'candidate' then private.staff_can_read_candidate(subject_id)
    when 'application' then private.staff_can_read_candidate(
      (select a.candidate_id from public.applications a where a.id = subject_id))
    when 'submission' then private.can_read_submission(subject_id)
    when 'interview' then private.can_read_submission(
      (select i.submission_id from public.interviews i where i.id = subject_id))
    when 'offer' then private.can_read_submission(
      (select o.submission_id from public.offers o where o.id = subject_id))
    when 'placement' then private.can_read_submission(
      (select p.submission_id from public.placements p where p.id = subject_id))
    else false
  end
$$;

-- Staff visibility of the person a consent or message is about.
create function private.staff_can_read_person(candidate uuid, employer_contact uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when candidate is not null then private.staff_can_read_candidate(candidate)
    when employer_contact is not null then private.can_read_employer(
      (select c.employer_id from public.employer_contacts c where c.id = employer_contact))
    else false
  end
$$;

-- =============================================================================
-- Privileges. RLS decides which rows; these decide which commands exist.
-- =============================================================================

-- anon: nothing, then INSERT on exactly the form fields of the three forms.
revoke all on all tables in schema public from anon;

grant insert (
  source, contact_name, contact_title, contact_email, contact_phone,
  company_name, role_title, requested_service, desk, specialty, city, state,
  work_mode, positions, target_start, salary_min, salary_max, salary_unit,
  submitted_details
) on public.leads to anon;

grant insert (
  full_name, email, phone, city, state, linkedin_url, message, desk,
  specialty, work_authorized, engagement_types, consent_store,
  consent_future_roles, resume_storage_path, resume_filename,
  resume_mime_type, resume_size_bytes
) on public.resume_submissions to anon;

grant insert (
  full_name, email, phone, enquiry_type, subject, message
) on public.contact_messages to anon;

-- Nobody hard-deletes, truncates, or attaches triggers through the API.
-- service_role included: erasure, when a data-rights request needs it, is a
-- deliberate reviewed operation, not something a backend bug can do.
revoke delete, truncate, references, trigger
  on all tables in schema public from authenticated, service_role;

-- The audit log is written only by the audit trigger.
revoke insert, update on public.audit_log from authenticated;
revoke update on public.audit_log from service_role;

-- The timeline is appended to, never edited.
revoke update on public.submission_events from authenticated, service_role;

-- Tables created by later migrations must not quietly hand anon access or
-- DELETE either; each has to grant what it needs explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke delete, truncate, references, trigger on tables from authenticated, service_role;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function public.can_send_message(text, uuid, uuid) from public, anon;
revoke execute on function public.record_opt_out(text, uuid, uuid, text, text) from public, anon;
grant execute on function public.can_send_message(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.record_opt_out(text, uuid, uuid, text, text) to authenticated, service_role;

-- =============================================================================
-- Enable RLS everywhere.
-- =============================================================================
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- =============================================================================
-- Soft delete: one restrictive pair per soft-deletable table.
-- A RESTRICTIVE policy is ANDed with every permissive one, so these hold
-- whatever else a role is granted.
--
-- "deleted_at = now()" admits a row only inside the transaction that deleted
-- it (private.stamp_soft_delete pins deleted_at to that transaction's
-- timestamp). Without it Postgres refuses the soft-deleting UPDATE itself,
-- because the updated row would be invisible to the caller's SELECT policy.
-- Who may soft-delete a row is therefore exactly who may UPDATE it.
-- =============================================================================

-- profiles: hides deleted profiles from everyone except administrators.
create policy profiles_hide_deleted on public.profiles as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- profiles: a deleted profile can be edited (restored) only by an administrator.
create policy profiles_freeze_deleted on public.profiles as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- employers: hides deleted employers from everyone except administrators.
create policy employers_hide_deleted on public.employers as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- employers: a deleted employer can be edited (restored) only by an administrator.
create policy employers_freeze_deleted on public.employers as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- employer_contacts: hides deleted contacts from everyone except administrators.
create policy employer_contacts_hide_deleted on public.employer_contacts as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- employer_contacts: a deleted contact can be edited (restored) only by an administrator.
create policy employer_contacts_freeze_deleted on public.employer_contacts as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- leads: hides deleted leads from everyone except administrators.
create policy leads_hide_deleted on public.leads as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- leads: a deleted lead can be edited (restored) only by an administrator.
create policy leads_freeze_deleted on public.leads as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- requisitions: hides deleted requisitions from everyone except administrators.
create policy requisitions_hide_deleted on public.requisitions as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- requisitions: a deleted requisition can be edited (restored) only by an administrator.
create policy requisitions_freeze_deleted on public.requisitions as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- requisition_assignments: hides removed assignments from everyone except administrators.
create policy requisition_assignments_hide_deleted on public.requisition_assignments as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- requisition_assignments: a removed assignment can be edited (restored) only by an administrator.
create policy requisition_assignments_freeze_deleted on public.requisition_assignments as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- jobs: hides deleted jobs from everyone except administrators.
create policy jobs_hide_deleted on public.jobs as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- jobs: a deleted job can be edited (restored) only by an administrator.
create policy jobs_freeze_deleted on public.jobs as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- contact_messages: hides deleted messages from everyone except administrators.
create policy contact_messages_hide_deleted on public.contact_messages as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- contact_messages: a deleted message can be edited (restored) only by an administrator.
create policy contact_messages_freeze_deleted on public.contact_messages as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- resume_submissions: hides deleted intake rows from everyone except administrators.
create policy resume_submissions_hide_deleted on public.resume_submissions as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- resume_submissions: a deleted intake row can be edited (restored) only by an administrator.
create policy resume_submissions_freeze_deleted on public.resume_submissions as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- candidates: hides deleted candidates from everyone except administrators.
create policy candidates_hide_deleted on public.candidates as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- candidates: a deleted candidate can be edited (restored) only by an administrator.
create policy candidates_freeze_deleted on public.candidates as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- candidate_engagement_types: hides removed preferences from everyone except administrators.
create policy candidate_engagement_types_hide_deleted on public.candidate_engagement_types as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- candidate_engagement_types: a removed preference can be edited (restored) only by an administrator.
create policy candidate_engagement_types_freeze_deleted on public.candidate_engagement_types as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- candidate_documents: hides deleted documents from everyone except administrators.
create policy candidate_documents_hide_deleted on public.candidate_documents as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- candidate_documents: a deleted document can be edited (restored) only by an administrator.
create policy candidate_documents_freeze_deleted on public.candidate_documents as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- candidate_embeddings: hides deleted embeddings from everyone except administrators.
create policy candidate_embeddings_hide_deleted on public.candidate_embeddings as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- candidate_embeddings: a deleted embedding can be edited (restored) only by an administrator.
create policy candidate_embeddings_freeze_deleted on public.candidate_embeddings as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- applications: hides deleted applications from everyone except administrators.
create policy applications_hide_deleted on public.applications as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- applications: a deleted application can be edited (restored) only by an administrator.
create policy applications_freeze_deleted on public.applications as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- submissions: hides deleted submissions from everyone except administrators.
create policy submissions_hide_deleted on public.submissions as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- submissions: a deleted submission can be edited (restored) only by an administrator.
create policy submissions_freeze_deleted on public.submissions as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- interviews: hides deleted interviews from everyone except administrators.
create policy interviews_hide_deleted on public.interviews as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- interviews: a deleted interview can be edited (restored) only by an administrator.
create policy interviews_freeze_deleted on public.interviews as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- offers: hides deleted offers from everyone except administrators.
create policy offers_hide_deleted on public.offers as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- offers: a deleted offer can be edited (restored) only by an administrator.
create policy offers_freeze_deleted on public.offers as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- placements: hides deleted placements from everyone except administrators.
create policy placements_hide_deleted on public.placements as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- placements: a deleted placement can be edited (restored) only by an administrator.
create policy placements_freeze_deleted on public.placements as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- activities: hides deleted activities from everyone except administrators.
create policy activities_hide_deleted on public.activities as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- activities: a deleted activity can be edited (restored) only by an administrator.
create policy activities_freeze_deleted on public.activities as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- communication_consents: hides deleted consent rows from everyone except administrators.
create policy communication_consents_hide_deleted on public.communication_consents as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- communication_consents: a deleted consent row cannot be edited except by an administrator.
create policy communication_consents_freeze_deleted on public.communication_consents as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- email_templates: hides deleted templates from everyone except administrators.
create policy email_templates_hide_deleted on public.email_templates as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- email_templates: a deleted template can be edited (restored) only by an administrator.
create policy email_templates_freeze_deleted on public.email_templates as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- message_log: hides deleted log rows from everyone except administrators.
create policy message_log_hide_deleted on public.message_log as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- message_log: a deleted log row can be edited (restored) only by an administrator.
create policy message_log_freeze_deleted on public.message_log as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- content: hides deleted content from everyone except administrators.
create policy content_hide_deleted on public.content as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
-- content: deleted content can be edited (restored) only by an administrator.
create policy content_freeze_deleted on public.content as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- =============================================================================
-- FOUNDATION
-- =============================================================================

-- profiles: every signed-in user may read their own profile, to know their own role.
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select private.current_profile_id()));

-- profiles: staff may read other staff profiles, so owners and assignees have names.
create policy profiles_select_staff_directory on public.profiles
  for select to authenticated
  using ((select private.is_staff()) and role not in ('employer_user', 'job_seeker'));

-- profiles: administrators may read every profile, to manage accounts.
create policy profiles_select_admin on public.profiles
  for select to authenticated using ((select private.is_admin()));

-- profiles: a user may update their own profile; the guard triggers limit it to full_name.
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select private.current_profile_id()))
  with check (id = (select private.current_profile_id()));

-- profiles: administrators may update profiles; the guard trigger keeps super_admin rows super_admin-only.
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- audit_log: administrators may read the audit trail. No policy anywhere permits writing it.
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using ((select private.is_admin()));

-- audit_settings: administrators may read the retention setting.
create policy audit_settings_select_admin on public.audit_settings
  for select to authenticated using ((select private.is_admin()));

-- audit_settings: only a super_admin may change audit retention; platform_admin cannot.
create policy audit_settings_update_super_admin on public.audit_settings
  for update to authenticated
  using ((select private.has_role('super_admin')))
  with check ((select private.has_role('super_admin')));

-- =============================================================================
-- TAXONOMY - readable by every signed-in user (forms and filters need it),
-- editable by administrators only. Not readable by anon.
-- =============================================================================

-- desks: any active signed-in user may read the desks.
create policy desks_select on public.desks
  for select to authenticated using ((select private.current_role()) is not null);
-- desks: administrators may add a desk.
create policy desks_insert_admin on public.desks
  for insert to authenticated with check ((select private.is_admin()));
-- desks: administrators may edit or retire a desk.
create policy desks_update_admin on public.desks
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- specialties: any active signed-in user may read the specialties.
create policy specialties_select on public.specialties
  for select to authenticated using ((select private.current_role()) is not null);
-- specialties: administrators may add a specialty.
create policy specialties_insert_admin on public.specialties
  for insert to authenticated with check ((select private.is_admin()));
-- specialties: administrators may edit or retire a specialty.
create policy specialties_update_admin on public.specialties
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- engagement_types: any active signed-in user may read the engagement types.
create policy engagement_types_select on public.engagement_types
  for select to authenticated using ((select private.current_role()) is not null);
-- engagement_types: administrators may add an engagement type.
create policy engagement_types_insert_admin on public.engagement_types
  for insert to authenticated with check ((select private.is_admin()));
-- engagement_types: administrators may edit or retire an engagement type.
create policy engagement_types_update_admin on public.engagement_types
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- work_modes: any active signed-in user may read the work modes.
create policy work_modes_select on public.work_modes
  for select to authenticated using ((select private.current_role()) is not null);
-- work_modes: administrators may add a work mode.
create policy work_modes_insert_admin on public.work_modes
  for insert to authenticated with check ((select private.is_admin()));
-- work_modes: administrators may edit or retire a work mode.
create policy work_modes_update_admin on public.work_modes
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- us_states: any active signed-in user may read the state list.
create policy us_states_select on public.us_states
  for select to authenticated using ((select private.current_role()) is not null);
-- us_states: administrators may add a state row.
create policy us_states_insert_admin on public.us_states
  for insert to authenticated with check ((select private.is_admin()));
-- us_states: administrators may edit a state row.
create policy us_states_update_admin on public.us_states
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- job_statuses: any active signed-in user may read the job statuses.
create policy job_statuses_select on public.job_statuses
  for select to authenticated using ((select private.current_role()) is not null);
-- job_statuses: administrators may add a job status.
create policy job_statuses_insert_admin on public.job_statuses
  for insert to authenticated with check ((select private.is_admin()));
-- job_statuses: administrators may edit or retire a job status.
create policy job_statuses_update_admin on public.job_statuses
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- lead_statuses: any active signed-in user may read the lead statuses.
create policy lead_statuses_select on public.lead_statuses
  for select to authenticated using ((select private.current_role()) is not null);
-- lead_statuses: administrators may add a lead status.
create policy lead_statuses_insert_admin on public.lead_statuses
  for insert to authenticated with check ((select private.is_admin()));
-- lead_statuses: administrators may edit or retire a lead status.
create policy lead_statuses_update_admin on public.lead_statuses
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- candidate_statuses: any active signed-in user may read the candidate statuses.
create policy candidate_statuses_select on public.candidate_statuses
  for select to authenticated using ((select private.current_role()) is not null);
-- candidate_statuses: administrators may add a candidate status.
create policy candidate_statuses_insert_admin on public.candidate_statuses
  for insert to authenticated with check ((select private.is_admin()));
-- candidate_statuses: administrators may edit or retire a candidate status.
create policy candidate_statuses_update_admin on public.candidate_statuses
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- submission_statuses: any active signed-in user may read the submission statuses.
create policy submission_statuses_select on public.submission_statuses
  for select to authenticated using ((select private.current_role()) is not null);
-- submission_statuses: administrators may add a submission status.
create policy submission_statuses_insert_admin on public.submission_statuses
  for insert to authenticated with check ((select private.is_admin()));
-- submission_statuses: administrators may edit or retire a submission status.
create policy submission_statuses_update_admin on public.submission_statuses
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- =============================================================================
-- CRM
-- =============================================================================

-- employers: staff read the employers their role and assignments reach (private.can_read_employer).
create policy employers_select on public.employers
  for select to authenticated using (private.can_read_employer(id));

-- employers: admins and research analysts add employers; a BDM may add one they own.
create policy employers_insert on public.employers
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (select private.has_role('research_analyst'))
    or ((select private.has_role('bdm')) and owner_id = (select private.current_profile_id()))
  );

-- employers: admins and research analysts edit employers; a BDM edits the ones they own.
create policy employers_update on public.employers
  for update to authenticated
  using (
    (select private.is_admin())
    or (select private.has_role('research_analyst'))
    or ((select private.has_role('bdm')) and owner_id = (select private.current_profile_id()))
  )
  with check (
    (select private.is_admin())
    or (select private.has_role('research_analyst'))
    or ((select private.has_role('bdm')) and owner_id = (select private.current_profile_id()))
  );

-- employer_contacts: anyone who can read the employer can read its contacts.
create policy employer_contacts_select on public.employer_contacts
  for select to authenticated using (private.can_read_employer(employer_id));

-- employer_contacts: anyone who can edit the employer can add its contacts.
create policy employer_contacts_insert on public.employer_contacts
  for insert to authenticated with check (private.can_write_employer(employer_id));

-- employer_contacts: anyone who can edit the employer can edit its contacts.
create policy employer_contacts_update on public.employer_contacts
  for update to authenticated
  using (private.can_write_employer(employer_id))
  with check (private.can_write_employer(employer_id));

-- leads: the public Request Talent form may create a new, unowned website lead and set nothing internal.
create policy leads_insert_public_form on public.leads
  for insert to anon, authenticated
  with check (
    source = 'website_form'
    and status = 'new'
    and owner_id is null
    and employer_id is null
    and engagement_type is null
    and urgency is null
    and notes is null
    and qualified_at is null
    and closed_reason is null
  );

-- leads: admins and research analysts read every lead; BDMs and full-desk recruiters read the leads they own.
create policy leads_select on public.leads
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.has_role('research_analyst'))
    or ((select private.has_role('bdm', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id()))
  );

-- leads: business-development staff may record a lead from any source.
create policy leads_insert_staff on public.leads
  for insert to authenticated
  with check ((select private.has_role(
    'super_admin', 'platform_admin', 'research_analyst', 'bdm', 'full_desk_recruiter')));

-- leads: the staff who can read a lead may work it.
create policy leads_update on public.leads
  for update to authenticated
  using (
    (select private.is_admin())
    or (select private.has_role('research_analyst'))
    or ((select private.has_role('bdm', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id()))
  )
  with check (
    (select private.is_admin())
    or (select private.has_role('research_analyst'))
    or ((select private.has_role('bdm', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id()))
  );

-- requisitions: owners, assignees and the employer's BDM read a requisition (private.can_read_requisition).
create policy requisitions_select on public.requisitions
  for select to authenticated using (private.can_read_requisition(id));

-- requisitions: a BDM opens requisitions they own on employers they may edit; admins open any.
create policy requisitions_insert on public.requisitions
  for insert to authenticated
  with check (
    (select private.is_admin())
    or ((select private.has_role('bdm'))
        and owner_id = (select private.current_profile_id())
        and private.can_write_employer(employer_id))
  );

-- requisitions: the managing BDM or an admin edits a requisition.
create policy requisitions_update on public.requisitions
  for update to authenticated
  using (private.can_manage_requisition(id))
  with check ((select private.is_admin()) or private.can_write_employer(employer_id));

-- requisition_assignments: a recruiter sees their own assignments; the managing BDM sees the requisition's.
create policy requisition_assignments_select on public.requisition_assignments
  for select to authenticated
  using (
    recruiter_id = (select private.current_profile_id())
    or private.can_manage_requisition(requisition_id)
  );

-- requisition_assignments: the managing BDM or an admin assigns recruiters.
create policy requisition_assignments_insert on public.requisition_assignments
  for insert to authenticated with check (private.can_manage_requisition(requisition_id));

-- requisition_assignments: the managing BDM or an admin edits or removes an assignment.
create policy requisition_assignments_update on public.requisition_assignments
  for update to authenticated
  using (private.can_manage_requisition(requisition_id))
  with check (private.can_manage_requisition(requisition_id));

-- jobs: any signed-in user reads a publicly visible job; staff also read jobs on requisitions they can see.
create policy jobs_select on public.jobs
  for select to authenticated
  using (
    ((select private.current_role()) is not null
     and private.job_is_public(status, is_test, published_at, expires_at, deleted_at))
    or private.can_read_requisition(requisition_id)
  );

-- jobs: only the managing BDM or an admin creates a posting, because publishing is public.
create policy jobs_insert on public.jobs
  for insert to authenticated with check (private.can_manage_requisition(requisition_id));

-- jobs: only the managing BDM or an admin edits, publishes or un-tests a posting.
create policy jobs_update on public.jobs
  for update to authenticated
  using (private.can_manage_requisition(requisition_id))
  with check (private.can_manage_requisition(requisition_id));

-- contact_messages: the public Contact form may create a new, unowned message.
create policy contact_messages_insert_public_form on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and owner_id is null);

-- contact_messages: admins read every message; CRM staff read the ones routed to them.
create policy contact_messages_select on public.contact_messages
  for select to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_crm_staff()) and owner_id = (select private.current_profile_id()))
  );

-- contact_messages: admins route messages; the owner works theirs.
create policy contact_messages_update on public.contact_messages
  for update to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_crm_staff()) and owner_id = (select private.current_profile_id()))
  )
  with check (
    (select private.is_admin())
    or ((select private.is_crm_staff()) and owner_id = (select private.current_profile_id()))
  );

-- =============================================================================
-- CANDIDATES AND THE PIPELINE
-- =============================================================================

-- resume_submissions: the public Upload Resume form may create a new, unowned, untriaged intake row.
create policy resume_submissions_insert_public_form on public.resume_submissions
  for insert to anon, authenticated
  with check (status = 'new' and owner_id is null and candidate_id is null);

-- resume_submissions: admins read all intake; a recruiter reads the intake rows routed to them.
create policy resume_submissions_select on public.resume_submissions
  for select to authenticated
  using (
    (select private.is_admin())
    or ((select private.has_role('recruiter', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id()))
  );

-- resume_submissions: admins route intake; the assigned recruiter triages it.
create policy resume_submissions_update on public.resume_submissions
  for update to authenticated
  using (
    (select private.is_admin())
    or ((select private.has_role('recruiter', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id()))
  )
  with check (
    (select private.is_admin())
    or ((select private.has_role('recruiter', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id()))
  );

-- candidates: a job seeker reads their own record; staff read the candidates they work (private.can_read_candidate).
create policy candidates_select on public.candidates
  for select to authenticated using (private.can_read_candidate(id));

-- candidates: a job seeker may create one record for themselves, under their own verified account email and nothing internal.
create policy candidates_insert_self on public.candidates
  for insert to authenticated
  with check (
    (select private.has_role('job_seeker'))
    and profile_id = (select private.current_profile_id())
    and public.normalize_email(email) = public.normalize_email((select auth.email()))
    and source = 'self_registered'
    and status = 'new'
    and owner_id is null
  );

-- candidates: a recruiter records a sourced candidate assigned to themselves; admins record any.
create policy candidates_insert_staff on public.candidates
  for insert to authenticated
  with check (
    (select private.is_admin())
    or ((select private.has_role('recruiter', 'full_desk_recruiter'))
        and owner_id = (select private.current_profile_id())
        and profile_id is null)
  );

-- candidates: a job seeker edits their own record, keeping their account email; the guard trigger limits the columns.
create policy candidates_update_self on public.candidates
  for update to authenticated
  using (profile_id = (select private.current_profile_id()))
  with check (
    profile_id = (select private.current_profile_id())
    and public.normalize_email(email) = public.normalize_email((select auth.email()))
  );

-- candidates: the recruiters who work a candidate, and admins, edit the record.
create policy candidates_update_staff on public.candidates
  for update to authenticated
  using (private.can_manage_candidate(id))
  with check (private.can_manage_candidate(id));

-- candidate_engagement_types: readable by whoever can read the candidate.
create policy candidate_engagement_types_select on public.candidate_engagement_types
  for select to authenticated using (private.can_read_candidate(candidate_id));

-- candidate_engagement_types: the candidate or their recruiters record a preference.
create policy candidate_engagement_types_insert on public.candidate_engagement_types
  for insert to authenticated
  with check (private.is_self_candidate(candidate_id) or private.can_manage_candidate(candidate_id));

-- candidate_engagement_types: the candidate or their recruiters remove a preference (soft delete).
create policy candidate_engagement_types_update on public.candidate_engagement_types
  for update to authenticated
  using (private.is_self_candidate(candidate_id) or private.can_manage_candidate(candidate_id))
  with check (private.is_self_candidate(candidate_id) or private.can_manage_candidate(candidate_id));

-- candidate_documents: the candidate and the staff who can read them see the documents; employers never do (they get a view of scrubbed versions only).
create policy candidate_documents_select on public.candidate_documents
  for select to authenticated using (private.can_read_candidate(candidate_id));

-- candidate_documents: a job seeker uploads originals of their own documents, as themselves.
create policy candidate_documents_insert_self on public.candidate_documents
  for insert to authenticated
  with check (
    private.is_self_candidate(candidate_id)
    and is_original
    and uploaded_by = (select private.current_profile_id())
  );

-- candidate_documents: the candidate's recruiters upload documents and create scrubbed versions.
create policy candidate_documents_insert_staff on public.candidate_documents
  for insert to authenticated with check (private.can_manage_candidate(candidate_id));

-- candidate_documents: a job seeker may withdraw (soft-delete) their own documents; the guard trigger allows nothing else.
create policy candidate_documents_update_self on public.candidate_documents
  for update to authenticated
  using (private.is_self_candidate(candidate_id))
  with check (private.is_self_candidate(candidate_id));

-- candidate_documents: the candidate's recruiters update document records.
create policy candidate_documents_update_staff on public.candidate_documents
  for update to authenticated
  using (private.can_manage_candidate(candidate_id))
  with check (private.can_manage_candidate(candidate_id));

-- candidate_embeddings: staff who can read the candidate may search their embedding; the candidate cannot.
create policy candidate_embeddings_select on public.candidate_embeddings
  for select to authenticated using (private.staff_can_read_candidate(candidate_id));

-- candidate_embeddings: embeddings are generated by the backend; only admins write them by hand.
create policy candidate_embeddings_insert_admin on public.candidate_embeddings
  for insert to authenticated with check ((select private.is_admin()));

-- candidate_embeddings: only admins update embeddings by hand.
create policy candidate_embeddings_update_admin on public.candidate_embeddings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- applications: a job seeker reads their own applications; staff read those of candidates they can read.
create policy applications_select on public.applications
  for select to authenticated
  using (private.is_self_candidate(candidate_id) or private.staff_can_read_candidate(candidate_id));

-- applications: a job seeker applies, for themselves, to an open public job, with consent to store.
create policy applications_insert_self on public.applications
  for insert to authenticated
  with check (
    private.is_self_candidate(candidate_id)
    and private.job_accepts_applications(job_id)
    and consent_store
    and status = 'submitted'
    and source = 'website'
  );

-- applications: a candidate's recruiters may record an application on their behalf.
create policy applications_insert_staff on public.applications
  for insert to authenticated with check (private.can_manage_candidate(candidate_id));

-- applications: a job seeker edits or withdraws their own application while it is still unreviewed.
create policy applications_update_self on public.applications
  for update to authenticated
  using (private.is_self_candidate(candidate_id))
  with check (private.is_self_candidate(candidate_id) and status in ('submitted', 'withdrawn'));

-- applications: a candidate's recruiters progress the application.
create policy applications_update_staff on public.applications
  for update to authenticated
  using (private.can_manage_candidate(candidate_id))
  with check (private.can_manage_candidate(candidate_id));

-- submissions: the submitting recruiter, the deciding BDM and admins read a submission (private.can_read_submission).
create policy submissions_select on public.submissions
  for select to authenticated using (private.can_read_submission(id));

-- submissions: recruiters and above submit candidates they work to requisitions they are on, as themselves; only full_desk_recruiter and above may flag a direct submission.
create policy submissions_insert on public.submissions
  for insert to authenticated
  with check (
    (select private.has_role(
      'super_admin', 'platform_admin', 'bdm', 'full_desk_recruiter', 'recruiter'))
    and submitted_by = (select private.current_profile_id())
    and private.staff_can_read_candidate(candidate_id)
    and private.can_read_requisition(requisition_id)
    and (
      not direct_submission
      or (select private.has_role('super_admin', 'platform_admin', 'bdm', 'full_desk_recruiter'))
    )
  );

-- submissions: a recruiter edits their own submissions, and cannot turn one into a direct submission unless full_desk_recruiter; sending is policed by the workflow trigger.
create policy submissions_update_recruiter on public.submissions
  for update to authenticated
  using (
    (select private.has_role('recruiter', 'full_desk_recruiter'))
    and submitted_by = (select private.current_profile_id())
  )
  with check (
    submitted_by = (select private.current_profile_id())
    and (not direct_submission or (select private.has_role('full_desk_recruiter')))
  );

-- submissions: the assigned or managing BDM records the decision and sends approved submissions.
create policy submissions_update_bdm on public.submissions
  for update to authenticated
  using (
    (select private.has_role('bdm'))
    and (bdm_id = (select private.current_profile_id())
         or private.can_manage_requisition(requisition_id))
  )
  with check (
    (select private.has_role('bdm'))
    and (bdm_id = (select private.current_profile_id())
         or private.can_manage_requisition(requisition_id))
  );

-- submissions: admins may edit any submission (the consent and approval CHECKs still bind them).
create policy submissions_update_admin on public.submissions
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- submission_events: whoever can read the submission reads its timeline.
create policy submission_events_select on public.submission_events
  for select to authenticated using (private.can_read_submission(submission_id));

-- submission_events: staff on a submission may add a note to its timeline, as themselves; every other event is written by trigger.
create policy submission_events_insert_note on public.submission_events
  for insert to authenticated
  with check (
    event_type = 'note'
    and actor_id = (select private.current_profile_id())
    and private.can_read_submission(submission_id)
  );

-- interviews: whoever can read the submission reads its interviews.
create policy interviews_select on public.interviews
  for select to authenticated using (private.can_read_submission(submission_id));

-- interviews: whoever works the submission schedules its interviews.
create policy interviews_insert on public.interviews
  for insert to authenticated with check (private.can_read_submission(submission_id));

-- interviews: whoever works the submission updates its interviews.
create policy interviews_update on public.interviews
  for update to authenticated
  using (private.can_read_submission(submission_id))
  with check (private.can_read_submission(submission_id));

-- offers: whoever can read the submission reads its offers.
create policy offers_select on public.offers
  for select to authenticated using (private.can_read_submission(submission_id));

-- offers: whoever works the submission records an offer on it.
create policy offers_insert on public.offers
  for insert to authenticated with check (private.can_read_submission(submission_id));

-- offers: whoever works the submission updates its offers.
create policy offers_update on public.offers
  for update to authenticated
  using (private.can_read_submission(submission_id))
  with check (private.can_read_submission(submission_id));

-- placements: whoever can read the originating submission reads the placement.
create policy placements_select on public.placements
  for select to authenticated using (private.can_read_submission(submission_id));

-- placements: placements are commercial records, so only the BDM on the submission or an admin creates one.
create policy placements_insert on public.placements
  for insert to authenticated
  with check (
    (select private.is_admin())
    or ((select private.has_role('bdm')) and private.can_read_submission(submission_id))
  );

-- placements: only the BDM on the submission or an admin updates a placement.
create policy placements_update on public.placements
  for update to authenticated
  using (
    (select private.is_admin())
    or ((select private.has_role('bdm')) and private.can_read_submission(submission_id))
  )
  with check (
    (select private.is_admin())
    or ((select private.has_role('bdm')) and private.can_read_submission(submission_id))
  );

-- =============================================================================
-- ACTIVITIES, COMMUNICATIONS, CONTENT
-- =============================================================================

-- activities: CRM staff read activities they logged, or on records they can read.
create policy activities_select on public.activities
  for select to authenticated
  using (
    (select private.is_crm_staff())
    and (
      actor_id = (select private.current_profile_id())
      or (select private.is_admin())
      or private.can_read_subject(subject_type, subject_id)
    )
  );

-- activities: CRM staff log activity, as themselves, on records they can read.
create policy activities_insert on public.activities
  for insert to authenticated
  with check (
    (select private.is_crm_staff())
    and actor_id = (select private.current_profile_id())
    and private.can_read_subject(subject_type, subject_id)
  );

-- activities: the person who logged an activity, or an admin, edits it.
create policy activities_update on public.activities
  for update to authenticated
  using (
    (select private.is_crm_staff())
    and (actor_id = (select private.current_profile_id()) or (select private.is_admin()))
  )
  with check (
    (select private.is_crm_staff())
    and (actor_id = (select private.current_profile_id()) or (select private.is_admin()))
  );

-- communication_consents: a job seeker reads their own consents; staff read those of people they can read.
create policy communication_consents_select on public.communication_consents
  for select to authenticated
  using (
    private.is_self_candidate(candidate_id)
    or ((select private.is_crm_staff())
        and private.staff_can_read_person(candidate_id, employer_contact_id))
  );

-- communication_consents: a job seeker records their own consent; staff record consent for people they can read.
create policy communication_consents_insert on public.communication_consents
  for insert to authenticated
  with check (
    private.is_self_candidate(candidate_id)
    or ((select private.is_crm_staff())
        and private.staff_can_read_person(candidate_id, employer_contact_id))
  );

-- communication_consents: the same people may withdraw a consent; the guard trigger allows nothing but a withdrawal.
create policy communication_consents_update on public.communication_consents
  for update to authenticated
  using (
    private.is_self_candidate(candidate_id)
    or ((select private.is_crm_staff())
        and private.staff_can_read_person(candidate_id, employer_contact_id))
  )
  with check (
    private.is_self_candidate(candidate_id)
    or ((select private.is_crm_staff())
        and private.staff_can_read_person(candidate_id, employer_contact_id))
  );

-- email_templates: CRM staff read templates to send from them.
create policy email_templates_select on public.email_templates
  for select to authenticated using ((select private.is_crm_staff()));

-- email_templates: only admins create templates.
create policy email_templates_insert_admin on public.email_templates
  for insert to authenticated with check ((select private.is_admin()));

-- email_templates: only admins edit templates.
create policy email_templates_update_admin on public.email_templates
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- message_log: CRM staff read messages to people they can read.
create policy message_log_select on public.message_log
  for select to authenticated
  using (
    (select private.is_crm_staff())
    and private.staff_can_read_person(candidate_id, employer_contact_id)
  );

-- message_log: CRM staff queue a message, as themselves, to a person they can read; the consent trigger may still refuse it.
create policy message_log_insert on public.message_log
  for insert to authenticated
  with check (
    (select private.is_crm_staff())
    and sent_by = (select private.current_profile_id())
    and private.staff_can_read_person(candidate_id, employer_contact_id)
  );

-- message_log: delivery status is written by the backend; only admins correct it by hand.
create policy message_log_update_admin on public.message_log
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- content: the content and marketing roles, and admins, read all content in every state.
create policy content_select on public.content
  for select to authenticated
  using ((select private.has_role(
    'super_admin', 'platform_admin', 'content_manager', 'marketing_manager')));

-- content: the content and marketing roles, and admins, draft content.
create policy content_insert on public.content
  for insert to authenticated
  with check ((select private.has_role(
    'super_admin', 'platform_admin', 'content_manager', 'marketing_manager')));

-- content: the content and marketing roles, and admins, edit and move content through review; the four-eyes CHECK still binds approval.
create policy content_update on public.content
  for update to authenticated
  using ((select private.has_role(
    'super_admin', 'platform_admin', 'content_manager', 'marketing_manager')))
  with check ((select private.has_role(
    'super_admin', 'platform_admin', 'content_manager', 'marketing_manager')));

-- =============================================================================
-- VIEWS
-- =============================================================================

-- The public job board. security_invoker, so it can only narrow what the
-- caller's own policies already allow; the site's server reads it with a
-- server-side key. Not granted to anon. No employer, no requisition detail.
create view public.public_jobs
with (security_invoker = true, security_barrier = true) as
select
  j.id, j.slug, j.title, j.public_description, j.desk, j.specialty,
  j.engagement_type, j.work_mode, j.city, j.state,
  j.salary_min, j.salary_max, j.salary_unit, j.salary_currency,
  j.published_at, j.expires_at, j.canonical_url, j.seo_title, j.seo_description
from public.jobs j
where private.job_is_public(j.status, j.is_test, j.published_at, j.expires_at, j.deleted_at);

-- The employer portal. These three run with the view owner's rights (the
-- default), which is deliberate: they are the ONLY way an employer_user reads
-- anything, and each one filters to the caller's own employer inside the
-- view. security_barrier stops a caller's predicate running ahead of that
-- filter. Supabase's linter flags owner-rights views; that is expected here.

-- An employer's own requisitions, without internal notes or ownership.
create view public.employer_requisitions
with (security_barrier = true) as
select
  r.id, r.employer_id, r.title, r.desk, r.specialty, r.engagement_type,
  r.work_mode, r.city, r.state, r.headcount,
  r.salary_min, r.salary_max, r.salary_unit, r.salary_currency,
  r.description, r.status, r.opened_at, r.target_start, r.closed_at
from public.requisitions r
where r.deleted_at is null
  and private.has_role('employer_user')
  and r.employer_id = private.current_employer_id();

-- Submissions that have been SENT to the caller's employer, and nothing else.
-- A candidate's email, phone and LinkedIn appear only once there is a live
-- placement of that candidate at this employer; before that they are NULL.
-- BDM notes, consent records and the recruiter are never exposed.
create view public.employer_submissions
with (security_barrier = true) as
select
  s.id,
  s.requisition_id,
  s.candidate_id,
  c.full_name as candidate_name,
  c.city as candidate_city,
  c.state as candidate_state,
  c.desk,
  c.specialty,
  c.work_authorized,
  s.shared_document_id,
  s.rate_or_salary,
  s.rate_unit,
  s.status,
  s.sent_to_employer_at,
  s.employer_response,
  s.employer_response_at,
  case when placed.id is not null then c.email end as candidate_email,
  case when placed.id is not null then c.phone end as candidate_phone,
  case when placed.id is not null then c.linkedin_url end as candidate_linkedin_url
from public.submissions s
join public.requisitions r on r.id = s.requisition_id
join public.candidates c on c.id = s.candidate_id
left join lateral (
  select p.id from public.placements p
  where p.submission_id = s.id
    and p.deleted_at is null
    and p.status <> 'fell_through'
  limit 1
) placed on true
where s.sent_to_employer_at is not null
  and s.deleted_at is null
  and r.deleted_at is null
  and c.deleted_at is null
  and private.has_role('employer_user')
  and r.employer_id = private.current_employer_id();

-- The one document per sent submission an employer may open: the scrubbed
-- version attached to it. An original can never appear here.
create view public.employer_submission_documents
with (security_barrier = true) as
select
  d.id,
  s.id as submission_id,
  d.kind,
  d.storage_path,
  d.original_filename,
  d.mime_type,
  d.size_bytes,
  d.version,
  d.uploaded_at
from public.submissions s
join public.requisitions r on r.id = s.requisition_id
join public.candidate_documents d on d.id = s.shared_document_id
where s.sent_to_employer_at is not null
  and s.deleted_at is null
  and r.deleted_at is null
  and d.deleted_at is null
  and not d.is_original
  and private.has_role('employer_user')
  and r.employer_id = private.current_employer_id();

-- SELECT only, for everyone. Supabase's default privileges grant ALL on new
-- relations, and a simple view is auto-updatable: left in place, an UPDATE
-- through employer_requisitions would run with the owner's rights and skip
-- RLS entirely. Revoke first, then grant the one command each view is for.
revoke all on public.public_jobs, public.employer_requisitions,
  public.employer_submissions, public.employer_submission_documents
  from anon, authenticated, service_role, public;
grant select on public.public_jobs, public.employer_requisitions,
  public.employer_submissions, public.employer_submission_documents to authenticated;
grant select on public.public_jobs to service_role;
