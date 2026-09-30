-- =============================================================================
-- 2. CRM CORE
--
-- Employers and their contacts, leads, requisitions and the public job
-- postings derived from them, plus the two intake tables behind the site's
-- other public forms.
--
-- The three public forms each land in their own table, and those three are
-- the only tables anon may write to (migration 5):
--   Request Talent  -> leads                (source = 'website_form')
--   Upload Resume   -> resume_submissions   (migration 3)
--   Contact         -> contact_messages
-- A resume form does NOT write to candidates. candidates carries a unique
-- normalised email, and an anonymous insert that failed on it would tell
-- anyone who asked whether an address is already on file. Intake rows are
-- triaged into candidates by staff.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Normalisation for duplicate detection. Public and IMMUTABLE so the
-- application runs exactly the same function when it checks before insert
-- as the generated columns below use to index.
--
-- Deliberately conservative: an email is trimmed and lower-cased and nothing
-- more. Stripping plus-addresses or Gmail dots would merge addresses that are
-- genuinely different mailboxes elsewhere.
-- -----------------------------------------------------------------------------
create function public.normalize_email(value text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select nullif(lower(btrim(value)), '')
$$;

-- "The Acme Company, Inc." and "acme co" both become "acme". Used to surface
-- likely duplicates for a human to judge, never to reject a row.
create function public.normalize_company_name(value text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(value, '')), '&', ' and ', 'g'),
          '[^a-z0-9]+', ' ', 'g'),
        '(^| )(the|inc|incorporated|llc|ltd|limited|corp|corporation|co|company|plc|lp|llp|pc|pllc)(?= |$)',
        ' ', 'g'),
      ' +', ' ', 'g')),
    '')
$$;

-- -----------------------------------------------------------------------------
-- Employers
-- The primary contact is the employer_contacts row flagged is_primary (at
-- most one live one per employer), not a column here: two sources of truth
-- for the same fact always disagree eventually.
-- -----------------------------------------------------------------------------
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (btrim(company_name) <> ''),
  company_name_normalized text
    generated always as (public.normalize_company_name(company_name)) stored,
  website text,
  industry text,
  size_band text
    check (size_band in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+')),
  address_line1 text,
  address_line2 text,
  city text,
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  postal_code text,
  owner_id uuid references public.profiles (id) on delete restrict,
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create index employers_company_name_normalized_idx on public.employers (company_name_normalized);
create index employers_owner_id_idx on public.employers (owner_id);
create index employers_state_idx on public.employers (state);
create index employers_created_by_idx on public.employers (created_by);
create index employers_deleted_at_idx on public.employers (deleted_at);
call private.attach_standard_triggers('public.employers');

-- An employer_user profile belongs to exactly one employer; nobody else has one.
alter table public.profiles
  add column employer_id uuid references public.employers (id) on delete restrict,
  add constraint profiles_employer_only_for_employer_users
    check (employer_id is null or role = 'employer_user');
create index profiles_employer_id_idx on public.profiles (employer_id);

-- The employer_user's employer, for policies and the employer views.
create function private.current_employer_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.employer_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'employer_user'
    and p.is_active
    and p.deleted_at is null
$$;

create table public.employer_contacts (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete restrict,
  full_name text not null check (btrim(full_name) <> ''),
  title text,
  email text,
  email_normalized text generated always as (public.normalize_email(email)) stored,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create index employer_contacts_employer_id_idx on public.employer_contacts (employer_id);
create index employer_contacts_email_normalized_idx on public.employer_contacts (email_normalized);
create index employer_contacts_created_by_idx on public.employer_contacts (created_by);
create index employer_contacts_deleted_at_idx on public.employer_contacts (deleted_at);
create unique index employer_contacts_one_primary_idx
  on public.employer_contacts (employer_id)
  where is_primary and deleted_at is null;
call private.attach_standard_triggers('public.employer_contacts');

-- -----------------------------------------------------------------------------
-- Leads
-- A lead may precede its employer record, so employer_id is nullable and the
-- company is also held as text. Duplicate detection is by index, not by
-- constraint: two leads from one company, or one person at two companies, are
-- normal business. The application checks normalised email and company
-- before insert and asks a human.
--
-- requested_service is what the lead asked for (the site's service select);
-- engagement_type is what was agreed at qualification. They differ often
-- enough to keep both.
-- -----------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('website_form', 'research', 'referral', 'other')),
  source_url text,
  employer_id uuid references public.employers (id) on delete restrict,
  contact_name text,
  contact_title text,
  contact_email text,
  contact_email_normalized text
    generated always as (public.normalize_email(contact_email)) stored,
  contact_phone text,
  company_name text,
  company_name_normalized text
    generated always as (public.normalize_company_name(company_name)) stored,
  role_title text,
  requested_service text
    references public.engagement_types (slug) on update restrict on delete restrict,
  engagement_type text
    references public.engagement_types (slug) on update restrict on delete restrict,
  desk text references public.desks (slug) on update restrict on delete restrict,
  specialty text,
  city text,
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  work_mode text references public.work_modes (slug) on update restrict on delete restrict,
  positions integer check (positions > 0),
  target_start date,
  salary_min numeric(12, 2) check (salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max >= 0),
  salary_unit text check (salary_unit in ('hour', 'year')),
  salary_currency char(3) not null default 'USD' check (salary_currency ~ '^[A-Z]{3}$'),
  urgency text check (urgency in ('low', 'normal', 'high', 'urgent')),
  -- What the submitter wrote in the form. Kept apart from notes, which is
  -- internal and never writable from the public form.
  submitted_details text,
  notes text,
  status text not null default 'new'
    references public.lead_statuses (slug) on update restrict on delete restrict,
  owner_id uuid references public.profiles (id) on delete restrict,
  qualified_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint leads_specialty_on_desk
    foreign key (desk, specialty) references public.specialties (desk, slug)
    on update restrict on delete restrict,
  constraint leads_specialty_needs_desk check (specialty is null or desk is not null),
  constraint leads_salary_range check (salary_min is null or salary_max is null or salary_min <= salary_max),
  constraint leads_salary_unit_with_range
    check ((salary_min is null and salary_max is null) or salary_unit is not null)
);

create index leads_contact_email_normalized_idx on public.leads (contact_email_normalized);
create index leads_company_name_normalized_idx on public.leads (company_name_normalized);
create index leads_employer_id_idx on public.leads (employer_id);
create index leads_requested_service_idx on public.leads (requested_service);
create index leads_engagement_type_idx on public.leads (engagement_type);
create index leads_desk_specialty_idx on public.leads (desk, specialty);
create index leads_state_idx on public.leads (state);
create index leads_work_mode_idx on public.leads (work_mode);
create index leads_status_idx on public.leads (status);
create index leads_owner_id_idx on public.leads (owner_id);
create index leads_created_by_idx on public.leads (created_by);
create index leads_deleted_at_idx on public.leads (deleted_at);
call private.attach_standard_triggers('public.leads');

-- -----------------------------------------------------------------------------
-- Requisitions: the employer's internal hiring need. owner_id is the BDM.
-- Recruiters are attached through requisition_assignments.
-- -----------------------------------------------------------------------------
create table public.requisitions (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete restrict,
  lead_id uuid references public.leads (id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  desk text not null references public.desks (slug) on update restrict on delete restrict,
  specialty text,
  engagement_type text not null
    references public.engagement_types (slug) on update restrict on delete restrict,
  work_mode text references public.work_modes (slug) on update restrict on delete restrict,
  city text,
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  headcount integer not null default 1 check (headcount > 0),
  salary_min numeric(12, 2) check (salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max >= 0),
  salary_unit text check (salary_unit in ('hour', 'year')),
  salary_currency char(3) not null default 'USD' check (salary_currency ~ '^[A-Z]{3}$'),
  description text,
  -- Never shown to the employer: the employer-facing view omits it.
  internal_notes text,
  owner_id uuid references public.profiles (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'on_hold', 'filled', 'cancelled')),
  opened_at timestamptz,
  target_start date,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint requisitions_specialty_on_desk
    foreign key (desk, specialty) references public.specialties (desk, slug)
    on update restrict on delete restrict,
  constraint requisitions_salary_range
    check (salary_min is null or salary_max is null or salary_min <= salary_max),
  constraint requisitions_salary_unit_with_range
    check ((salary_min is null and salary_max is null) or salary_unit is not null),
  constraint requisitions_closed_means_closed
    check (closed_at is null or status in ('filled', 'cancelled'))
);

create index requisitions_employer_id_idx on public.requisitions (employer_id);
create index requisitions_lead_id_idx on public.requisitions (lead_id);
create index requisitions_desk_specialty_idx on public.requisitions (desk, specialty);
create index requisitions_engagement_type_idx on public.requisitions (engagement_type);
create index requisitions_work_mode_idx on public.requisitions (work_mode);
create index requisitions_state_idx on public.requisitions (state);
create index requisitions_owner_id_idx on public.requisitions (owner_id);
create index requisitions_status_idx on public.requisitions (status);
create index requisitions_created_by_idx on public.requisitions (created_by);
create index requisitions_deleted_at_idx on public.requisitions (deleted_at);
call private.attach_standard_triggers('public.requisitions');

create table public.requisition_assignments (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions (id) on delete restrict,
  recruiter_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create unique index requisition_assignments_live_idx
  on public.requisition_assignments (requisition_id, recruiter_id)
  where deleted_at is null;
create index requisition_assignments_recruiter_id_idx on public.requisition_assignments (recruiter_id);
create index requisition_assignments_created_by_idx on public.requisition_assignments (created_by);
call private.attach_standard_triggers('public.requisition_assignments');

-- -----------------------------------------------------------------------------
-- Jobs: the PUBLIC posting derived from a requisition. Separate because not
-- every requisition is published and a posting has its own lifecycle.
--
-- Pay transparency is enforced here, not in a form: salary_min, salary_max
-- and the unit are NOT NULL, so a job without a range cannot exist at all,
-- published or not. (The site's Job type requires the unit as well as the
-- range: "$45" means nothing without "per hour".)
--
-- is_test defaults TRUE. A job is created as a test and becomes real only by
-- someone deliberately setting is_test = false; a test job is never publicly
-- visible (private.job_is_public). A fabricated posting in Google for Jobs
-- can take the whole domain out of it - see CLAUDE.md, "The job board".
--
-- A job carries no employer or client name. hiringOrganization is always
-- Talentrax Global; the employer is reachable only through the requisition,
-- which the public never sees.
-- -----------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.requisitions (id) on delete restrict,
  -- Globally unique for all time, deleted rows included: a posting URL is
  -- never reused, because an expired one must keep answering 410.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (btrim(title) <> ''),
  public_description text,
  desk text not null references public.desks (slug) on update restrict on delete restrict,
  specialty text,
  engagement_type text not null
    references public.engagement_types (slug) on update restrict on delete restrict,
  work_mode text not null references public.work_modes (slug) on update restrict on delete restrict,
  city text,
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  salary_min numeric(12, 2) not null check (salary_min > 0),
  salary_max numeric(12, 2) not null,
  salary_unit text not null check (salary_unit in ('hour', 'year')),
  salary_currency char(3) not null default 'USD' check (salary_currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft'
    references public.job_statuses (slug) on update restrict on delete restrict,
  is_test boolean not null default true,
  published_at timestamptz,
  expires_at timestamptz,
  canonical_url text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint jobs_specialty_on_desk
    foreign key (desk, specialty) references public.specialties (desk, slug)
    on update restrict on delete restrict,
  constraint jobs_salary_range check (salary_min <= salary_max),
  -- A published job has a publication date, an expiry after it, and a range.
  -- (The range is also NOT NULL above; it is restated so this one constraint
  -- reads as the whole publication rule.)
  constraint jobs_published_is_complete check (
    status <> 'published'
    or (
      published_at is not null
      and expires_at is not null
      and expires_at > published_at
      and salary_min is not null
      and salary_max is not null
    )
  ),
  -- A JobPosting for a non-remote role needs a place.
  constraint jobs_published_has_location check (
    status <> 'published' or work_mode = 'remote' or (city is not null and state is not null)
  )
);

create index jobs_requisition_id_idx on public.jobs (requisition_id);
create index jobs_desk_specialty_idx on public.jobs (desk, specialty);
create index jobs_engagement_type_idx on public.jobs (engagement_type);
create index jobs_work_mode_idx on public.jobs (work_mode);
create index jobs_state_idx on public.jobs (state);
create index jobs_status_idx on public.jobs (status);
create index jobs_public_idx on public.jobs (published_at, expires_at)
  where status = 'published' and not is_test and deleted_at is null;
create index jobs_created_by_idx on public.jobs (created_by);
create index jobs_deleted_at_idx on public.jobs (deleted_at);
call private.attach_standard_triggers('public.jobs');

-- A slug is frozen once the job has ever been published: the URL is public.
create function private.guard_job_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null and new.slug is distinct from old.slug then
    raise exception 'a job slug cannot change once published'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_job_slug
  before update on public.jobs
  for each row execute function private.guard_job_slug();

-- The one definition of "publicly visible". Used by the job policy and the
-- public_jobs view (migration 5), so the two cannot disagree.
create function private.job_is_public(
  job_status text,
  job_is_test boolean,
  job_published_at timestamptz,
  job_expires_at timestamptz,
  job_deleted_at timestamptz
)
returns boolean
language sql stable
set search_path = ''
as $$
  select job_status = 'published'
     and not job_is_test
     and job_deleted_at is null
     and job_published_at <= now()
     and job_expires_at > now()
$$;

-- -----------------------------------------------------------------------------
-- Contact form intake. enquiry_type uses the site's own values.
-- -----------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (btrim(full_name) <> ''),
  email text not null check (btrim(email) <> ''),
  email_normalized text generated always as (public.normalize_email(email)) stored,
  phone text,
  enquiry_type text not null check (enquiry_type in ('employer', 'job-seeker')),
  subject text not null,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'closed', 'spam')),
  owner_id uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create index contact_messages_email_normalized_idx on public.contact_messages (email_normalized);
create index contact_messages_status_idx on public.contact_messages (status);
create index contact_messages_owner_id_idx on public.contact_messages (owner_id);
create index contact_messages_created_by_idx on public.contact_messages (created_by);
create index contact_messages_deleted_at_idx on public.contact_messages (deleted_at);
call private.attach_standard_triggers('public.contact_messages');
