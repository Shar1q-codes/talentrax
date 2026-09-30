-- =============================================================================
-- 1. FOUNDATION
--
-- Extensions, the role model, profiles, the RLS helper functions every policy
-- reads role through, the audit log, the row-stamping triggers, and the
-- editable taxonomy seeded from src/content/taxonomy.ts.
--
-- Conventions used by every later migration:
--   * Every table has id uuid default gen_random_uuid(), created_at,
--     updated_at, created_by. private.stamp_row() owns those four columns:
--     callers cannot forge created_by or backdate created_at.
--   * Every business table has deleted_at. Nothing is hard-deleted; DELETE is
--     revoked in migration 5 and no DELETE policy exists anywhere.
--   * Foreign keys are ON DELETE RESTRICT unless a comment says otherwise.
--     Nothing holding candidate data cascades, ever.
--   * Fixed vocabularies the schema's own logic depends on (a decision, a
--     channel) are text + CHECK. Vocabularies the client edits are taxonomy
--     tables referenced by slug.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

-- Helpers live here, outside the API-exposed schema, so PostgREST cannot
-- offer them as RPC endpoints.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Roles, in descending order of power. The declaration order is deliberate
-- and documented, but no policy relies on enum ordering: "and above" is always
-- spelled out as an explicit role list so the rule is readable in place.
-- -----------------------------------------------------------------------------
create type public.app_role as enum (
  'super_admin',
  'platform_admin',
  'bdm',
  'full_desk_recruiter',
  'recruiter',
  'research_analyst',
  'content_manager',
  'marketing_manager',
  'employer_user',
  'job_seeker'
);

-- -----------------------------------------------------------------------------
-- Profiles: one per auth.users row.
-- id IS the auth user id, so it has no default of its own. The FK is RESTRICT:
-- deleting an auth user who has a profile fails, which is the point - accounts
-- are deactivated (is_active = false), not removed.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  role public.app_role not null default 'job_seeker',
  full_name text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create index profiles_role_idx on public.profiles (role);
create index profiles_created_by_idx on public.profiles (created_by);

-- -----------------------------------------------------------------------------
-- RLS helper functions.
--
-- Every policy reads the caller's identity and role through these and nothing
-- else. SECURITY DEFINER so they can read profiles without recursing through
-- profiles' own policies; search_path pinned empty so nothing can shadow a
-- table name. A deactivated or soft-deleted profile resolves to NULL, which
-- every policy treats as "no access at all".
-- -----------------------------------------------------------------------------

-- The caller's profile id, or NULL when anonymous, deactivated or deleted.
create function private.current_profile_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.deleted_at is null
$$;

-- The caller's role, or NULL when anonymous, deactivated or deleted.
create function private.current_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.deleted_at is null
$$;

create function private.has_role(variadic roles public.app_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(private.current_role() = any (roles), false)
$$;

-- Every internal role. Note content_manager and marketing_manager are staff
-- but hold no CRM access: no CRM policy uses is_staff() alone.
create function private.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_role(
    'super_admin', 'platform_admin', 'bdm', 'full_desk_recruiter',
    'recruiter', 'research_analyst', 'content_manager', 'marketing_manager'
  )
$$;

-- Staff who work CRM and pipeline data. The content roles are excluded.
create function private.is_crm_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_role(
    'super_admin', 'platform_admin', 'bdm', 'full_desk_recruiter',
    'recruiter', 'research_analyst'
  )
$$;

create function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_role('super_admin', 'platform_admin')
$$;

-- TRUE when the statement comes from an end user through the API (the anon
-- or authenticated role), FALSE for service_role, migrations and psql.
-- Triggers use it to decide whether field-level workflow rules apply: the
-- backend and operators are trusted, browsers are not. Both the JWT claim and
-- the SET ROLE are checked, so neither alone can make a request look trusted.
create function private.is_end_user_request()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.role(), '') in ('anon', 'authenticated')
      or coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Row stamping: created_at / created_by / updated_at.
--
-- End users cannot choose their own created_by or created_at. The trusted
-- backend may supply created_by (a job acting for a user); otherwise it is
-- the caller. On update the creation columns are frozen and the id is
-- immutable.
-- -----------------------------------------------------------------------------
create function private.stamp_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if private.is_end_user_request() then
      new.created_by := auth.uid();
      new.created_at := now();
    else
      new.created_by := coalesce(new.created_by, auth.uid());
      new.created_at := coalesce(new.created_at, now());
    end if;
    new.updated_at := new.created_at;
  else
    if new.id is distinct from old.id then
      raise exception 'id is immutable on %', tg_table_name
        using errcode = 'check_violation';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Append-only tables (the audit log, the submission timeline) refuse every
-- UPDATE and DELETE, from every role, service_role included: RLS alone would
-- not stop service_role, which bypasses it.
create function private.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: % is not permitted', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- -----------------------------------------------------------------------------
-- Audit log. Written only by private.audit_row(); no role may insert into it
-- directly except service_role, and nobody may update or delete it.
--
-- actor_id and record_id deliberately have no foreign key. The log records
-- what happened to rows in any table, and it must never be the reason a
-- future, deliberate erasure fails - nor lose its record when one succeeds.
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null
    check (action in ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  -- Never changes: the table refuses UPDATE. Present for uniformity.
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index audit_log_record_idx on public.audit_log (table_name, record_id, occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function private.forbid_mutation();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.forbid_mutation();

-- Request metadata, as PostgREST exposes it. Headers are client-influenced;
-- they are recorded as evidence, never trusted for authorisation.
create function private.request_header(header_name text)
returns text
language sql stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true), '')::jsonb ->> header_name
$$;

create function private.request_ip()
returns inet
language plpgsql stable
set search_path = ''
as $$
declare
  raw text;
begin
  raw := coalesce(
    private.request_header('cf-connecting-ip'),
    private.request_header('x-real-ip'),
    split_part(private.request_header('x-forwarded-for'), ',', 1)
  );
  if raw is null or btrim(raw) = '' then
    return null;
  end if;
  return btrim(raw)::inet;
exception
  when others then
    return null;
end;
$$;

-- The generic audit trigger. Embedding vectors are stripped: they are derived,
-- 1536 floats long, and would drown the log.
create function private.audit_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  old_json jsonb;
  new_json jsonb;
  audit_action text := tg_op;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_json := to_jsonb(old) - 'embedding';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_json := to_jsonb(new) - 'embedding';
  end if;

  if tg_op = 'UPDATE' then
    if old_json ->> 'deleted_at' is null and new_json ->> 'deleted_at' is not null then
      audit_action := 'SOFT_DELETE';
    elsif old_json ->> 'deleted_at' is not null and new_json ->> 'deleted_at' is null then
      audit_action := 'RESTORE';
    end if;
  end if;

  insert into public.audit_log (
    actor_id, action, table_name, record_id, old_values, new_values,
    ip, user_agent, created_by
  ) values (
    auth.uid(),
    audit_action,
    tg_table_schema || '.' || tg_table_name,
    coalesce(new_json ->> 'id', old_json ->> 'id')::uuid,
    old_json,
    new_json,
    private.request_ip(),
    private.request_header('user-agent'),
    auth.uid()
  );
  return null;
end;
$$;

-- Soft delete. deleted_at is always the transaction timestamp at which the
-- row was first deleted: a client cannot backdate or postdate it, and a
-- second "delete" does not move it. End users cannot insert a row already
-- deleted.
--
-- Pinning it to now() is also what makes soft delete possible at all under
-- RLS. An UPDATE with a WHERE clause must leave the row visible to the
-- caller's SELECT policies, so a policy that hides deleted rows would refuse
-- every soft delete by a non-admin. The hide-deleted policies (migration 5)
-- therefore also admit deleted_at = now(): the row stays visible inside the
-- one transaction that deleted it, and to nobody but admins afterwards.
-- SECURITY DEFINER like stamp_row: it fires on anon's form inserts, and anon
-- holds no rights in the private schema.
create function private.stamp_soft_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if private.is_end_user_request() then
      new.deleted_at := null;
    end if;
  elsif old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
  elsif old.deleted_at is not null and new.deleted_at is not null then
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;

-- One call per table attaches the stamping and audit triggers (and the soft
-- delete stamp where the table has deleted_at), so no table can end up with
-- one and not the others.
create procedure private.attach_standard_triggers(target regclass)
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'create trigger stamp_row before insert or update on %s
       for each row execute function private.stamp_row()', target);
  execute format(
    'create trigger audit_row after insert or update or delete on %s
       for each row execute function private.audit_row()', target);
  if exists (
    select 1 from pg_attribute
    where attrelid = target and attname = 'deleted_at' and not attisdropped
  ) then
    execute format(
      'create trigger stamp_soft_delete before insert or update on %s
         for each row execute function private.stamp_soft_delete()', target);
  end if;
end;
$$;

-- Audit retention. Recorded here so the decision has one home and only a
-- super_admin can change it (migration 5). NULL means keep indefinitely.
-- Nothing purges yet: audit_log refuses DELETE outright, so any future purge
-- has to be a deliberate, reviewed migration that reads this value.
-- The period itself is a client decision - CLIENT-CONFIRM.md item 18.
create table public.audit_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  retention_days integer check (retention_days is null or retention_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict
);
create index audit_settings_created_by_idx on public.audit_settings (created_by);
call private.attach_standard_triggers('public.audit_settings');
insert into public.audit_settings (retention_days) values (null);

call private.attach_standard_triggers('public.profiles');

-- -----------------------------------------------------------------------------
-- Profile creation on signup. The role is ALWAYS job_seeker: nothing the
-- signup request carries (user metadata included) can influence it. Staff and
-- employer users are promoted afterwards by an admin.
-- -----------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    'job_seeker',
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Profile guard: who may change a role, an active flag, or a super_admin.
--
--   * Only super_admin and platform_admin change role, is_active, deleted_at
--     or employer_id (added in migration 2).
--   * Nobody changes their own role or active flag - no self-promotion, and
--     no admin locking themselves out.
--   * Only a super_admin may grant super_admin, or change a super_admin's
--     row in any way. platform_admin manages everyone else.
--   * Everyone else may edit their own full_name and nothing more.
-- The trusted backend (service_role, migrations) is not constrained here.
-- -----------------------------------------------------------------------------
create function private.guard_profile_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_role public.app_role := private.current_role();
  privileged_change boolean;
begin
  if not private.is_end_user_request() then
    return new;
  end if;

  privileged_change :=
       new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
    or new.deleted_at is distinct from old.deleted_at
    or (to_jsonb(new) ->> 'employer_id') is distinct from (to_jsonb(old) ->> 'employer_id')
    or new.email is distinct from old.email;

  if (old.role = 'super_admin' or new.role = 'super_admin')
     and caller_role is distinct from 'super_admin' then
    raise exception 'only a super_admin may grant super_admin or change a super_admin'
      using errcode = 'insufficient_privilege';
  end if;

  if privileged_change then
    if caller_role is null or caller_role not in ('super_admin', 'platform_admin') then
      raise exception 'only an administrator may change role, status or employer'
        using errcode = 'insufficient_privilege';
    end if;
    if old.id = caller
       and (new.role is distinct from old.role
            or new.is_active is distinct from old.is_active
            or new.deleted_at is distinct from old.deleted_at) then
      raise exception 'you may not change your own role or status'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

-- -----------------------------------------------------------------------------
-- Self-service guard. Attached to tables an end user may edit about
-- themselves (their candidate row, documents, applications, consents). For a
-- non-staff caller, every column outside the allowed list must be unchanged;
-- the allowed list is passed as trigger arguments. Staff and the trusted
-- backend pass straight through - their limits are in the policies.
-- -----------------------------------------------------------------------------
create function private.guard_self_service()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  allowed text[] := coalesce(tg_argv::text[], '{}') || array['updated_at'];
begin
  if not private.is_end_user_request() or private.is_staff() then
    return new;
  end if;
  -- Generated columns are not computed until after BEFORE triggers, so NEW
  -- holds NULL for them here. They derive from other columns anyway.
  allowed := allowed || array(
    select a.attname::text from pg_attribute a
    where a.attrelid = tg_relid and a.attgenerated <> '' and not a.attisdropped
  );
  if (to_jsonb(old) - allowed) is distinct from (to_jsonb(new) - allowed) then
    raise exception 'that change on % is not permitted from your account', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_profile_self_service
  before update on public.profiles
  for each row execute function private.guard_self_service('full_name');

-- =============================================================================
-- TAXONOMY
--
-- Real tables, because the client edits them without a migration. Every row
-- has a stable slug; the site and every foreign key reference the slug, never
-- the uuid. Slugs are immutable once created (a rename is a new row and a
-- deactivation of the old one), which is what makes them safe to reference.
-- Rows are retired with is_active = false, never deleted.
--
-- Seeded from src/content/taxonomy.ts and src/content/request-talent.ts so the
-- site and the database agree on day one. The four status vocabularies have
-- no source in the site; they are workflow defaults for the client to confirm
-- (CLIENT-CONFIRM.md item 18). is_system marks the rows the schema's own
-- constraints name, which cannot be deactivated.
-- =============================================================================

create function private.guard_taxonomy_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'taxonomy slugs are immutable (% on %)', old.slug, tg_table_name
      using errcode = 'check_violation';
  end if;
  if (to_jsonb(old) ->> 'is_system')::boolean and not new.is_active then
    raise exception '% is referenced by the schema and cannot be deactivated', old.slug
      using errcode = 'check_violation';
  end if;
  if (to_jsonb(old) ->> 'is_system') is distinct from (to_jsonb(new) ->> 'is_system') then
    raise exception 'is_system is fixed by migration' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create procedure private.create_taxonomy_table(table_name text, with_system_flag boolean)
language plpgsql
set search_path = ''
as $$
begin
  execute format($f$
    create table public.%1$I (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique
        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
      name text not null check (btrim(name) <> ''),
      description text,
      sort_order integer not null default 0,
      is_active boolean not null default true,
      %2$s
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      created_by uuid references public.profiles (id) on delete restrict
    )$f$,
    table_name,
    case when with_system_flag then 'is_system boolean not null default false,' else '' end);
  execute format('create index %1$I on public.%2$I (created_by)',
    table_name || '_created_by_idx', table_name);
  execute format(
    'create trigger guard_taxonomy_row before update on public.%I
       for each row execute function private.guard_taxonomy_row()', table_name);
  call private.attach_standard_triggers(format('public.%I', table_name)::regclass);
end;
$$;

call private.create_taxonomy_table('desks', false);
call private.create_taxonomy_table('engagement_types', false);
call private.create_taxonomy_table('work_modes', false);
call private.create_taxonomy_table('us_states', false);
call private.create_taxonomy_table('job_statuses', true);
call private.create_taxonomy_table('lead_statuses', true);
call private.create_taxonomy_table('candidate_statuses', true);
call private.create_taxonomy_table('submission_statuses', true);

-- Specialties belong to a desk. (desk, slug) is unique so other tables can
-- carry a composite foreign key proving the specialty is on that desk.
call private.create_taxonomy_table('specialties', false);
alter table public.specialties
  add column desk text not null references public.desks (slug) on update restrict on delete restrict,
  add constraint specialties_desk_slug_key unique (desk, slug);
create index specialties_desk_idx on public.specialties (desk);

-- States are referenced by their USPS code, the value the site's forms and
-- the JobPosting location already use. The slug is the lower-case code.
alter table public.us_states
  add column code char(2) not null unique check (code ~ '^[A-Z]{2}$'),
  add constraint us_states_slug_matches_code check (slug = lower(code));

-- ---------------------------------------------------------------- Seed data

insert into public.desks (slug, name, sort_order) values
  ('healthcare', 'Healthcare', 1),
  ('technology', 'Technology', 2),
  ('professional', 'Professional', 3);

insert into public.specialties (desk, slug, name, description, sort_order) values
  ('healthcare', 'nursing', 'Nursing', 'Med-surg, critical care, perioperative, emergency and specialty units', 1),
  ('healthcare', 'np-aprn', 'NP / APRN', 'Nurse practitioners and advanced practice nurses across primary and specialty care', 2),
  ('healthcare', 'allied-health', 'Allied health', 'Imaging, laboratory, respiratory, rehabilitation and pharmacy support', 3),
  ('healthcare', 'physicians', 'Physicians', 'Employed and locum physician roles, hospital-based and ambulatory', 4),
  ('technology', 'software-engineering', 'Software engineering', 'Frontend, backend, full-stack, mobile and platform engineering', 1),
  ('technology', 'cybersecurity', 'Cybersecurity', 'Security engineering and operations, governance and risk, identity, incident response', 2),
  ('technology', 'data', 'Data', 'Data engineering, analytics, business intelligence and machine learning', 3),
  ('technology', 'cloud', 'Cloud', 'Cloud architecture, migration and platform operations', 4),
  ('technology', 'devops', 'DevOps', 'CI/CD, infrastructure as code, observability and site reliability', 5),
  ('technology', 'qa', 'QA', 'Manual and automated testing, SDET and release quality', 6),
  ('professional', 'accounting-finance', 'Accounting and finance', 'Accounting, financial planning and analysis, payroll and revenue cycle', 1),
  ('professional', 'human-resources', 'Human resources', 'HR business partnering, talent acquisition, benefits and HR operations', 2),
  ('professional', 'administrative', 'Administrative', 'Executive assistance, coordination, scheduling and office operations', 3),
  ('professional', 'sales-marketing', 'Sales and marketing', 'Business development, account management, marketing and communications', 4),
  ('professional', 'trades', 'Trades', 'Skilled trades, facilities, maintenance and light industrial', 5);

-- Direct Hire, Contract, Executive Search - and only those. Healthcare RPO and
-- Contract-to-Hire were withdrawn by the client (CLAUDE.md, "What we offer").
insert into public.engagement_types (slug, name, sort_order) values
  ('direct-hire', 'Direct Hire', 1),
  ('contract', 'Contract', 2),
  ('executive-search', 'Executive Search', 3);

insert into public.work_modes (slug, name, description, sort_order) values
  ('onsite', 'Onsite', 'On location for every shift', 1),
  ('hybrid', 'Hybrid', 'Split between site and remote', 2),
  ('remote', 'Remote', 'No regular onsite requirement', 3);

insert into public.us_states (code, slug, name, sort_order)
select code, lower(code), name, ordinality::integer
from unnest(
  array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL',
        'IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE',
        'NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD',
        'TN','TX','UT','VT','VA','WA','WV','WI','WY'],
  array['Alabama','Alaska','Arizona','Arkansas','California','Colorado',
        'Connecticut','Delaware','District of Columbia','Florida','Georgia',
        'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
        'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota',
        'Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
        'New Jersey','New Mexico','New York','North Carolina','North Dakota',
        'Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
        'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
        'Virginia','Washington','West Virginia','Wisconsin','Wyoming']
) with ordinality as s(code, name, ordinality);

insert into public.job_statuses (slug, name, is_system, sort_order) values
  ('draft', 'Draft', true, 1),
  ('published', 'Published', true, 2),
  ('paused', 'Paused', false, 3),
  ('closed', 'Closed', true, 4);

insert into public.lead_statuses (slug, name, is_system, sort_order) values
  ('new', 'New', true, 1),
  ('contacted', 'Contacted', false, 2),
  ('qualified', 'Qualified', false, 3),
  ('converted', 'Converted', false, 4),
  ('disqualified', 'Disqualified', false, 5);

insert into public.candidate_statuses (slug, name, is_system, sort_order) values
  ('new', 'New', true, 1),
  ('active', 'Active', false, 2),
  ('placed', 'Placed', false, 3),
  ('inactive', 'Inactive', false, 4),
  ('do-not-contact', 'Do not contact', true, 5);

-- draft is the default. The four statuses from sent-to-employer onward are
-- named by the constraint that a status past "sent" requires sent_to_employer_at.
insert into public.submission_statuses (slug, name, is_system, sort_order) values
  ('draft', 'Draft', true, 1),
  ('pending-bdm-review', 'Pending BDM review', false, 2),
  ('approved', 'Approved', false, 3),
  ('sent-to-employer', 'Sent to employer', true, 4),
  ('interviewing', 'Interviewing', true, 5),
  ('offered', 'Offered', true, 6),
  ('placed', 'Placed', true, 7),
  ('rejected', 'Rejected', false, 8),
  ('withdrawn', 'Withdrawn', false, 9);
