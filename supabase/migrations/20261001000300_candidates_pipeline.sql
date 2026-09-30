-- =============================================================================
-- 3. CANDIDATES AND THE PIPELINE
--
-- APPLICATIONS AND SUBMISSIONS ARE DIFFERENT TABLES.
--   application  - a candidate applying to a job of their own accord.
--   submission   - Talentrax putting a candidate forward to an employer for a
--                  requisition. Created by a recruiter, never by a candidate.
-- A submission may originate from an application or from direct sourcing.
-- Offers hang off submissions, placements off offers, so the chain from
-- "someone applied" to "someone started" is one path of foreign keys.
--
-- The consent promise and the BDM approval gate are CHECK constraints on
-- submissions, not UI conventions: a row cannot reach an employer without
-- them, whoever writes it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Resume form intake. Raw, unverified, and separate from candidates for the
-- reason given at the top of migration 2. Staff triage a row into a candidate
-- (candidate_id is set then). No EEO or demographic field exists here or on
-- candidates: that collection is separate and later (content/upload-resume.ts).
-- -----------------------------------------------------------------------------
create table public.resume_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (btrim(full_name) <> ''),
  email text not null check (btrim(email) <> ''),
  email_normalized text generated always as (public.normalize_email(email)) stored,
  phone text,
  city text,
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  linkedin_url text,
  message text,
  desk text references public.desks (slug) on update restrict on delete restrict,
  specialty text,
  -- Authorised to work in the US without sponsorship. A plain yes/no, as on
  -- the form; no visa detail is ever collected.
  work_authorized boolean,
  -- Validated against engagement_types by trigger: an array cannot carry a
  -- foreign key, and this is a raw form row, not the candidate record.
  engagement_types text[] not null default '{}',
  -- The form cannot be submitted without it, so the row cannot exist without it.
  consent_store boolean not null check (consent_store),
  consent_future_roles boolean not null default false,
  consent_recorded_at timestamptz not null default now(),
  -- Object key from the presigned upload; the bytes never pass through here.
  resume_storage_path text,
  resume_filename text,
  resume_mime_type text,
  resume_size_bytes bigint check (resume_size_bytes > 0),
  status text not null default 'new'
    check (status in ('new', 'triaged', 'converted', 'rejected', 'spam')),
  owner_id uuid references public.profiles (id) on delete restrict,
  candidate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint resume_submissions_specialty_on_desk
    foreign key (desk, specialty) references public.specialties (desk, slug)
    on update restrict on delete restrict,
  constraint resume_submissions_specialty_needs_desk check (specialty is null or desk is not null)
);

create function private.check_engagement_types_array()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.engagement_types) as t(slug)
    where not exists (select 1 from public.engagement_types e where e.slug = t.slug)
  ) then
    raise exception 'unknown engagement type in %', new.engagement_types
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger check_engagement_types
  before insert or update of engagement_types on public.resume_submissions
  for each row execute function private.check_engagement_types_array();

create index resume_submissions_email_normalized_idx on public.resume_submissions (email_normalized);
create index resume_submissions_state_idx on public.resume_submissions (state);
create index resume_submissions_desk_specialty_idx on public.resume_submissions (desk, specialty);
create index resume_submissions_status_idx on public.resume_submissions (status);
create index resume_submissions_owner_id_idx on public.resume_submissions (owner_id);
create index resume_submissions_candidate_id_idx on public.resume_submissions (candidate_id);
create index resume_submissions_created_by_idx on public.resume_submissions (created_by);
create index resume_submissions_deleted_at_idx on public.resume_submissions (deleted_at);
call private.attach_standard_triggers('public.resume_submissions');

-- -----------------------------------------------------------------------------
-- Candidates
-- profile_id is set when the candidate registered themselves, NULL when a
-- recruiter sourced them. owner_id is the recruiter the candidate is
-- assigned to.
-- -----------------------------------------------------------------------------
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete restrict,
  full_name text not null check (btrim(full_name) <> ''),
  email text,
  email_normalized text generated always as (public.normalize_email(email)) stored,
  phone text,
  city text,
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  desk text references public.desks (slug) on update restrict on delete restrict,
  specialty text,
  -- Authorised to work in the US without sponsorship. NULL = not yet known.
  work_authorized boolean,
  expected_salary numeric(12, 2) check (expected_salary >= 0),
  expected_salary_unit text check (expected_salary_unit in ('hour', 'year')),
  linkedin_url text,
  status text not null default 'new'
    references public.candidate_statuses (slug) on update restrict on delete restrict,
  source text not null default 'sourced'
    check (source in ('self_registered', 'resume_form', 'application', 'sourced', 'referral', 'other')),
  owner_id uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint candidates_specialty_on_desk
    foreign key (desk, specialty) references public.specialties (desk, slug)
    on update restrict on delete restrict,
  constraint candidates_specialty_needs_desk check (specialty is null or desk is not null),
  constraint candidates_salary_unit
    check (expected_salary is null or expected_salary_unit is not null)
);

-- One live candidate per mailbox. Soft-deleted rows do not block a new one.
create unique index candidates_email_normalized_key
  on public.candidates (email_normalized)
  where deleted_at is null;
create index candidates_state_idx on public.candidates (state);
create index candidates_desk_specialty_idx on public.candidates (desk, specialty);
create index candidates_status_idx on public.candidates (status);
create index candidates_owner_id_idx on public.candidates (owner_id);
create index candidates_created_by_idx on public.candidates (created_by);
create index candidates_deleted_at_idx on public.candidates (deleted_at);
call private.attach_standard_triggers('public.candidates');

-- A candidate may edit their contact and preference fields. Status, source,
-- owner and the profile link are the firm's, not theirs.
create trigger guard_self_service
  before update on public.candidates
  for each row execute function private.guard_self_service(
    'full_name', 'email', 'phone', 'city', 'state', 'desk', 'specialty',
    'work_authorized', 'expected_salary', 'expected_salary_unit', 'linkedin_url'
  );

alter table public.resume_submissions
  add constraint resume_submissions_candidate_id_fkey
  foreign key (candidate_id) references public.candidates (id) on delete restrict;

-- The caller's own candidate row, for the self-service policies.
create function private.current_candidate_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select c.id
  from public.candidates c
  where c.profile_id = private.current_profile_id()
    and c.deleted_at is null
$$;

-- Desired engagement types: a join table so each one is a real foreign key.
create table public.candidate_engagement_types (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  engagement_type text not null
    references public.engagement_types (slug) on update restrict on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create unique index candidate_engagement_types_live_idx
  on public.candidate_engagement_types (candidate_id, engagement_type)
  where deleted_at is null;
create index candidate_engagement_types_engagement_type_idx
  on public.candidate_engagement_types (engagement_type);
create index candidate_engagement_types_created_by_idx
  on public.candidate_engagement_types (created_by);
call private.attach_standard_triggers('public.candidate_engagement_types');

create trigger guard_self_service
  before update on public.candidate_engagement_types
  for each row execute function private.guard_self_service('deleted_at');

-- -----------------------------------------------------------------------------
-- Candidate documents
--
-- ORIGINALS ARE NEVER SHARED. An original is uploaded once and never edited.
-- A scrubbed version (contact details removed) is a separate row pointing at
-- its original through parent_document_id, numbered from 1. Only scrubbed
-- rows can be attached to a submission, and only those reach an employer.
-- The composite foreign key proves a version belongs to the same candidate
-- as its original.
--
-- NOTE: this table governs the metadata. The bytes live in Supabase Storage,
-- whose own policies must mirror these rules before any upload is wired up.
-- Those are not in this commit.
-- -----------------------------------------------------------------------------
create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  kind text not null
    check (kind in ('resume', 'cover_letter', 'certification', 'other')),
  storage_path text not null unique,
  original_filename text,
  mime_type text,
  size_bytes bigint check (size_bytes > 0),
  uploaded_by uuid references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  is_original boolean not null default true,
  parent_document_id uuid,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint candidate_documents_id_candidate_key unique (id, candidate_id),
  constraint candidate_documents_parent_same_candidate
    foreign key (parent_document_id, candidate_id)
    references public.candidate_documents (id, candidate_id) on delete restrict,
  constraint candidate_documents_original_has_no_parent
    check (is_original = (parent_document_id is null)),
  constraint candidate_documents_original_is_version_one
    check (not is_original or version = 1)
);

create unique index candidate_documents_version_idx
  on public.candidate_documents (parent_document_id, version)
  where parent_document_id is not null;
create index candidate_documents_parent_idx
  on public.candidate_documents (parent_document_id, candidate_id);
create index candidate_documents_candidate_id_idx on public.candidate_documents (candidate_id);
create index candidate_documents_uploaded_by_idx on public.candidate_documents (uploaded_by);
create index candidate_documents_created_by_idx on public.candidate_documents (created_by);
create index candidate_documents_deleted_at_idx on public.candidate_documents (deleted_at);
call private.attach_standard_triggers('public.candidate_documents');

-- A version's parent must itself be an original (no scrub of a scrub), and a
-- document's identity fields never change after upload.
create function private.guard_candidate_document()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.parent_document_id is not null and not exists (
    select 1 from public.candidate_documents d
    where d.id = new.parent_document_id and d.is_original
  ) then
    raise exception 'a scrubbed version must reference an original document'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and (
       new.candidate_id is distinct from old.candidate_id
    or new.storage_path is distinct from old.storage_path
    or new.is_original is distinct from old.is_original
    or new.parent_document_id is distinct from old.parent_document_id
    or new.version is distinct from old.version
  ) then
    raise exception 'a document''s identity cannot change; upload a new version'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_candidate_document
  before insert or update on public.candidate_documents
  for each row execute function private.guard_candidate_document();

create trigger guard_self_service
  before update on public.candidate_documents
  for each row execute function private.guard_self_service('deleted_at');

-- -----------------------------------------------------------------------------
-- Candidate embeddings. 1536 dimensions: pgvector's HNSW index supports up to
-- 2000, so this indexes natively (3072 would need halfvec).
-- -----------------------------------------------------------------------------
create table public.candidate_embeddings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  source_document_id uuid,
  embedding extensions.vector(1536) not null,
  model_name text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint candidate_embeddings_document_same_candidate
    foreign key (source_document_id, candidate_id)
    references public.candidate_documents (id, candidate_id) on delete restrict
);

create index candidate_embeddings_hnsw_idx
  on public.candidate_embeddings using hnsw (embedding extensions.vector_cosine_ops);
create index candidate_embeddings_candidate_id_idx on public.candidate_embeddings (candidate_id);
create index candidate_embeddings_source_document_id_idx
  on public.candidate_embeddings (source_document_id, candidate_id);
create index candidate_embeddings_created_by_idx on public.candidate_embeddings (created_by);
create index candidate_embeddings_deleted_at_idx on public.candidate_embeddings (deleted_at);
call private.attach_standard_triggers('public.candidate_embeddings');

-- -----------------------------------------------------------------------------
-- Applications: the candidate's own act.
-- consent_recorded_at is stamped whenever either consent changes, so the
-- record always says when the current answer was given.
-- -----------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  applied_at timestamptz not null default now(),
  source text not null default 'website'
    check (source in ('website', 'job_board', 'referral', 'recruiter_entered', 'other')),
  cover_note text,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'shortlisted', 'not_selected', 'withdrawn')),
  consent_store boolean not null,
  consent_future_roles boolean not null default false,
  consent_recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint applications_id_candidate_key unique (id, candidate_id)
);

create unique index applications_one_per_job_idx
  on public.applications (candidate_id, job_id)
  where deleted_at is null;
create index applications_job_id_idx on public.applications (job_id);
create index applications_status_idx on public.applications (status);
create index applications_created_by_idx on public.applications (created_by);
create index applications_deleted_at_idx on public.applications (deleted_at);
call private.attach_standard_triggers('public.applications');

create function private.stamp_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.consent_store is distinct from old.consent_store
     or new.consent_future_roles is distinct from old.consent_future_roles then
    new.consent_recorded_at := now();
  else
    new.consent_recorded_at := old.consent_recorded_at;
  end if;
  return new;
end;
$$;

create trigger stamp_consent
  before insert or update on public.applications
  for each row execute function private.stamp_consent();

-- A candidate may withdraw, edit their note, or change their consents.
create trigger guard_self_service
  before update on public.applications
  for each row execute function private.guard_self_service(
    'cover_note', 'status', 'consent_store', 'consent_future_roles', 'consent_recorded_at'
  );

-- -----------------------------------------------------------------------------
-- Submissions: Talentrax putting a candidate forward.
-- -----------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  requisition_id uuid not null references public.requisitions (id) on delete restrict,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  application_id uuid,
  -- The scrubbed document the employer receives. Never an original.
  shared_document_id uuid,
  candidate_consent_obtained boolean not null default false,
  candidate_consent_at timestamptz,
  bdm_id uuid references public.profiles (id) on delete restrict,
  bdm_decision text not null default 'pending'
    check (bdm_decision in ('pending', 'approved', 'rejected', 'more_profiles_requested')),
  bdm_decision_at timestamptz,
  bdm_notes text,
  sent_to_employer_at timestamptz,
  employer_response text,
  employer_response_at timestamptz,
  rate_or_salary numeric(12, 2) check (rate_or_salary >= 0),
  rate_unit text check (rate_unit in ('hour', 'year')),
  status text not null default 'draft'
    references public.submission_statuses (slug) on update restrict on delete restrict,
  direct_submission boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,

  constraint submissions_application_same_candidate
    foreign key (application_id, candidate_id)
    references public.applications (id, candidate_id) on delete restrict,
  constraint submissions_document_same_candidate
    foreign key (shared_document_id, candidate_id)
    references public.candidate_documents (id, candidate_id) on delete restrict,

  -- THE GATE. Nothing reaches an employer without the candidate's consent,
  -- and without either a BDM approval or a sanctioned direct submission.
  constraint submissions_send_requires_consent_and_approval check (
    sent_to_employer_at is null
    or (
      candidate_consent_obtained
      and (bdm_decision = 'approved' or direct_submission)
    )
  ),
  constraint submissions_consent_is_dated
    check (not candidate_consent_obtained or candidate_consent_at is not null),
  constraint submissions_decision_is_dated
    check ((bdm_decision = 'pending') = (bdm_decision_at is null)),
  constraint submissions_response_after_send
    check (employer_response_at is null or sent_to_employer_at is not null),
  -- A status that says it went to the employer must be backed by the gate.
  constraint submissions_status_matches_send check (
    status not in ('sent-to-employer', 'interviewing', 'offered', 'placed')
    or sent_to_employer_at is not null
  ),
  constraint submissions_rate_unit
    check (rate_or_salary is null or rate_unit is not null)
);

create unique index submissions_one_per_requisition_idx
  on public.submissions (candidate_id, requisition_id)
  where deleted_at is null;
create index submissions_requisition_id_idx on public.submissions (requisition_id);
create index submissions_submitted_by_idx on public.submissions (submitted_by);
create index submissions_application_id_idx on public.submissions (application_id, candidate_id);
create index submissions_shared_document_id_idx on public.submissions (shared_document_id, candidate_id);
create index submissions_bdm_id_idx on public.submissions (bdm_id, bdm_decision);
create index submissions_status_idx on public.submissions (status);
create index submissions_sent_to_employer_at_idx on public.submissions (sent_to_employer_at);
create index submissions_created_by_idx on public.submissions (created_by);
create index submissions_deleted_at_idx on public.submissions (deleted_at);
call private.attach_standard_triggers('public.submissions');

-- -----------------------------------------------------------------------------
-- Submission workflow rules that depend on WHO is acting. The CHECK
-- constraints above say what a valid row is; this says who may move it.
--
--   * submitted_by is the caller. A recruiter cannot submit as someone else.
--   * bdm_id defaults to the requisition's owner.
--   * Only the assigned BDM (or an admin) records a BDM decision.
--   * sent_to_employer_at may be set or changed only by the assigned BDM, an
--     admin, or - for a direct submission - a full_desk_recruiter.
--     A recruiter can never send.
--   * The shared document must be a scrubbed version, never an original.
--   * Consent and decision timestamps are stamped when their flag changes.
-- The trusted backend is exempt from the WHO rules, never from the CHECKs.
-- -----------------------------------------------------------------------------
create function private.submission_workflow()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  caller uuid := private.current_profile_id();
  end_user boolean := private.is_end_user_request();
begin
  if tg_op = 'INSERT' then
    if end_user then
      new.submitted_by := caller;
    end if;
    if new.bdm_id is null then
      select r.owner_id into new.bdm_id
      from public.requisitions r where r.id = new.requisition_id;
    end if;
  end if;

  if new.candidate_consent_obtained
     and (tg_op = 'INSERT' or not old.candidate_consent_obtained) then
    new.candidate_consent_at := coalesce(new.candidate_consent_at, now());
  end if;

  if tg_op = 'INSERT' or new.bdm_decision is distinct from old.bdm_decision then
    if new.bdm_decision = 'pending' then
      new.bdm_decision_at := null;
    elsif tg_op = 'INSERT' or old.bdm_decision is distinct from new.bdm_decision then
      new.bdm_decision_at := now();
    end if;
  end if;

  if new.shared_document_id is not null and exists (
    select 1 from public.candidate_documents d
    where d.id = new.shared_document_id and d.is_original
  ) then
    raise exception 'an original document is never shared; attach a scrubbed version'
      using errcode = 'check_violation';
  end if;

  if not end_user then
    return new;
  end if;

  if (tg_op = 'INSERT' and new.bdm_decision <> 'pending')
     or (tg_op = 'UPDATE' and new.bdm_decision is distinct from old.bdm_decision) then
    if not (private.is_admin()
            or (private.has_role('bdm') and new.bdm_id = caller)) then
      raise exception 'only the assigned BDM may record a BDM decision'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if (tg_op = 'INSERT' and new.sent_to_employer_at is not null)
     or (tg_op = 'UPDATE' and new.sent_to_employer_at is distinct from old.sent_to_employer_at) then
    if not (private.is_admin()
            or (private.has_role('bdm') and new.bdm_id = caller)
            or (private.has_role('full_desk_recruiter') and new.direct_submission
                and new.submitted_by = caller)) then
      raise exception 'you may not send a submission to an employer'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger submission_workflow
  before insert or update on public.submissions
  for each row execute function private.submission_workflow();

-- -----------------------------------------------------------------------------
-- The timeline. Append-only; written by trigger on every status change,
-- decision and send, plus free-text notes staff add. This is the single
-- timeline for a submission.
-- -----------------------------------------------------------------------------
create table public.submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'status_changed', 'consent_recorded', 'bdm_decision',
    'sent_to_employer', 'employer_response', 'note'
  )),
  from_status text,
  to_status text,
  actor_id uuid references public.profiles (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  -- Never changes: the table refuses UPDATE. Present for uniformity.
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict
);

create index submission_events_submission_idx
  on public.submission_events (submission_id, occurred_at desc);
create index submission_events_actor_id_idx on public.submission_events (actor_id);
create index submission_events_created_by_idx on public.submission_events (created_by);
call private.attach_standard_triggers('public.submission_events');

create trigger submission_events_append_only
  before update or delete on public.submission_events
  for each row execute function private.forbid_mutation();

create function private.submission_timeline()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.submission_events (submission_id, event_type, to_status, actor_id)
    values (new.id, 'created', new.status, actor);
  else
    if new.status is distinct from old.status then
      insert into public.submission_events (submission_id, event_type, from_status, to_status, actor_id)
      values (new.id, 'status_changed', old.status, new.status, actor);
    end if;
    if new.bdm_decision is distinct from old.bdm_decision then
      insert into public.submission_events (submission_id, event_type, from_status, to_status, actor_id, notes)
      values (new.id, 'bdm_decision', old.bdm_decision, new.bdm_decision, actor, new.bdm_notes);
    end if;
    if new.employer_response is distinct from old.employer_response then
      insert into public.submission_events (submission_id, event_type, actor_id, notes)
      values (new.id, 'employer_response', actor, new.employer_response);
    end if;
  end if;

  if new.candidate_consent_obtained
     and (tg_op = 'INSERT' or not old.candidate_consent_obtained) then
    insert into public.submission_events (submission_id, event_type, actor_id)
    values (new.id, 'consent_recorded', actor);
  end if;
  if new.sent_to_employer_at is not null
     and (tg_op = 'INSERT' or old.sent_to_employer_at is null) then
    insert into public.submission_events (submission_id, event_type, actor_id)
    values (new.id, 'sent_to_employer', actor);
  end if;
  return null;
end;
$$;

create trigger submission_timeline
  after insert or update on public.submissions
  for each row execute function private.submission_timeline();

-- Interviews and offers only exist for a submission the employer has
-- received: nothing reaches an employer except through the gate.
create function private.require_sent_submission()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.submissions s
    where s.id = new.submission_id and s.sent_to_employer_at is not null
  ) then
    raise exception '% requires a submission that has been sent to the employer', tg_table_name
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Interviews. interviewer_names are the employer's interviewers, held for
-- scheduling; they are internal records and never rendered on the site.
-- -----------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete restrict,
  round integer not null default 1 check (round >= 1),
  scheduled_at timestamptz,
  duration_minutes integer check (duration_minutes > 0),
  mode text not null check (mode in ('phone', 'video', 'onsite')),
  location_or_link text,
  interviewer_names text[] not null default '{}',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  outcome text,
  feedback text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create index interviews_submission_id_idx on public.interviews (submission_id, round);
create index interviews_scheduled_at_idx on public.interviews (scheduled_at) where status = 'scheduled';
create index interviews_created_by_idx on public.interviews (created_by);
create index interviews_deleted_at_idx on public.interviews (deleted_at);
call private.attach_standard_triggers('public.interviews');

create trigger require_sent_submission
  before insert or update of submission_id on public.interviews
  for each row execute function private.require_sent_submission();

-- -----------------------------------------------------------------------------
-- Offers: against a SUBMISSION, not a candidate and a job. An offer exists
-- because a submission progressed.
-- -----------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete restrict,
  salary numeric(12, 2) check (salary >= 0),
  salary_unit text check (salary_unit in ('hour', 'year')),
  start_date date,
  offered_at timestamptz not null default now(),
  status text not null default 'extended'
    check (status in ('extended', 'accepted', 'declined', 'withdrawn', 'expired')),
  responded_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint offers_salary_unit check (salary is null or salary_unit is not null),
  constraint offers_response_is_dated
    check (status not in ('accepted', 'declined') or responded_at is not null),
  constraint offers_decline_reason_only_on_decline
    check (decline_reason is null or status = 'declined')
);

create index offers_submission_id_idx on public.offers (submission_id);
create index offers_status_idx on public.offers (status);
create index offers_created_by_idx on public.offers (created_by);
create index offers_deleted_at_idx on public.offers (deleted_at);
call private.attach_standard_triggers('public.offers');

create trigger require_sent_submission
  before insert or update of submission_id on public.offers
  for each row execute function private.require_sent_submission();

-- -----------------------------------------------------------------------------
-- Placements. One per accepted offer. candidate, employer, requisition and
-- submission are denormalised for querying and access checks, and are always
-- DERIVED from the offer by trigger - they can never disagree with it.
-- fee_basis_notes records the basis agreed; the terms themselves are
-- unconfirmed (CLIENT-CONFIRM.md item 9) and no fee column exists.
-- -----------------------------------------------------------------------------
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers (id) on delete restrict,
  submission_id uuid not null references public.submissions (id) on delete restrict,
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  employer_id uuid not null references public.employers (id) on delete restrict,
  requisition_id uuid not null references public.requisitions (id) on delete restrict,
  start_date date not null,
  end_date date,
  guarantee_period_end date,
  status text not null default 'pending_start'
    check (status in ('pending_start', 'active', 'completed', 'fell_through', 'ended_early')),
  fee_basis_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint placements_end_after_start check (end_date is null or end_date >= start_date),
  constraint placements_guarantee_after_start
    check (guarantee_period_end is null or guarantee_period_end >= start_date)
);

create index placements_submission_id_idx on public.placements (submission_id);
create index placements_candidate_id_idx on public.placements (candidate_id);
create index placements_employer_id_idx on public.placements (employer_id);
create index placements_requisition_id_idx on public.placements (requisition_id);
create index placements_status_idx on public.placements (status);
create index placements_created_by_idx on public.placements (created_by);
create index placements_deleted_at_idx on public.placements (deleted_at);
call private.attach_standard_triggers('public.placements');

create function private.derive_placement()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  offer_status text;
begin
  select o.status, s.id, s.candidate_id, r.employer_id, r.id
    into offer_status, new.submission_id, new.candidate_id, new.employer_id, new.requisition_id
  from public.offers o
  join public.submissions s on s.id = o.submission_id
  join public.requisitions r on r.id = s.requisition_id
  where o.id = new.offer_id;

  if offer_status is distinct from 'accepted' then
    raise exception 'a placement requires an accepted offer'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger derive_placement
  before insert or update on public.placements
  for each row execute function private.derive_placement();
