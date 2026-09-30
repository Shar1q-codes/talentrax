-- =============================================================================
-- 4. ACTIVITIES, COMMUNICATIONS, CONTENT
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Activities: calls, emails, notes and tasks against any record.
-- Polymorphic, so subject_id cannot carry a foreign key; the trigger below
-- proves the subject exists instead, and the access policy (migration 5)
-- inherits the subject's own visibility.
-- -----------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in (
    'employer', 'employer_contact', 'lead', 'requisition', 'job', 'candidate',
    'application', 'submission', 'interview', 'offer', 'placement'
  )),
  subject_id uuid not null,
  kind text not null check (kind in ('call', 'email', 'sms', 'meeting', 'note', 'task')),
  direction text check (direction in ('inbound', 'outbound')),
  subject_line text,
  body text,
  outcome text,
  next_action text,
  due_at timestamptz,
  completed_at timestamptz,
  actor_id uuid references public.profiles (id) on delete restrict,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz
);

create index activities_subject_idx
  on public.activities (subject_type, subject_id, occurred_at desc);
create index activities_actor_id_idx on public.activities (actor_id, occurred_at desc);
create index activities_open_tasks_idx on public.activities (actor_id, due_at)
  where kind = 'task' and completed_at is null and deleted_at is null;
create index activities_created_by_idx on public.activities (created_by);
create index activities_deleted_at_idx on public.activities (deleted_at);
call private.attach_standard_triggers('public.activities');

create function private.check_activity_subject()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  found boolean;
begin
  execute format(
    'select exists (select 1 from public.%I where id = $1)',
    case new.subject_type
      when 'employer' then 'employers'
      when 'employer_contact' then 'employer_contacts'
      when 'lead' then 'leads'
      when 'requisition' then 'requisitions'
      when 'job' then 'jobs'
      when 'candidate' then 'candidates'
      when 'application' then 'applications'
      when 'submission' then 'submissions'
      when 'interview' then 'interviews'
      when 'offer' then 'offers'
      when 'placement' then 'placements'
    end)
  into found
  using new.subject_id;
  if not found then
    raise exception 'activity subject % % does not exist', new.subject_type, new.subject_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger check_activity_subject
  before insert or update of subject_type, subject_id on public.activities
  for each row execute function private.check_activity_subject();

-- -----------------------------------------------------------------------------
-- Communication consents. One row is one consent record for one person on
-- one channel. Rows are never rewritten: a withdrawal sets withdrawn_at once,
-- and a later opt-in is a NEW row. At most one live opt-in exists per person
-- and channel.
--
-- SMS is opt-in: sending requires a live opt-in row, so a STOP (which sets
-- withdrawn_at, or records a withdrawal if there was nothing to withdraw)
-- makes sending impossible - message_log refuses the insert. Email is
-- opt-out: it is refused once the person has withdrawn and not opted back in.
-- -----------------------------------------------------------------------------
create table public.communication_consents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates (id) on delete restrict,
  employer_contact_id uuid references public.employer_contacts (id) on delete restrict,
  channel text not null check (channel in ('email', 'sms')),
  -- The number or address the consent was given for, as evidence.
  address text,
  consent_given boolean not null,
  given_at timestamptz,
  withdrawn_at timestamptz,
  source text not null check (source in (
    'web_form', 'verbal', 'written', 'sms_keyword', 'email_link', 'import', 'other'
  )),
  source_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint communication_consents_one_person
    check (num_nonnulls(candidate_id, employer_contact_id) = 1),
  constraint communication_consents_given_is_dated
    check (not consent_given or given_at is not null),
  -- A record that was never an opt-in exists only to record an opt-out.
  constraint communication_consents_refusal_is_withdrawal
    check (consent_given or withdrawn_at is not null),
  constraint communication_consents_withdrawn_after_given
    check (withdrawn_at is null or given_at is null or withdrawn_at >= given_at)
);

create unique index communication_consents_live_candidate_idx
  on public.communication_consents (candidate_id, channel)
  where consent_given and withdrawn_at is null and deleted_at is null;
create unique index communication_consents_live_contact_idx
  on public.communication_consents (employer_contact_id, channel)
  where consent_given and withdrawn_at is null and deleted_at is null;
create index communication_consents_candidate_id_idx
  on public.communication_consents (candidate_id, channel);
create index communication_consents_employer_contact_id_idx
  on public.communication_consents (employer_contact_id, channel);
create index communication_consents_created_by_idx on public.communication_consents (created_by);
create index communication_consents_deleted_at_idx on public.communication_consents (deleted_at);
call private.attach_standard_triggers('public.communication_consents');

-- The only change a consent row accepts is being withdrawn, once. Deleting
-- one is refused too: soft-deleting an opt-out would quietly re-enable email.
create function private.guard_consent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.withdrawn_at is not null and new.withdrawn_at is distinct from old.withdrawn_at then
    raise exception 'a withdrawal cannot be undone; record a new consent instead'
      using errcode = 'check_violation';
  end if;
  if (to_jsonb(old) - array['withdrawn_at', 'updated_at'])
     is distinct from (to_jsonb(new) - array['withdrawn_at', 'updated_at']) then
    raise exception 'a consent record is immutable apart from its withdrawal'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_consent_update
  before update on public.communication_consents
  for each row execute function private.guard_consent_update();

-- Whether a message may be sent right now. Invoker rights: callers see the
-- consents their own access allows; the send worker runs as service_role.
create function public.can_send_message(
  p_channel text,
  p_candidate_id uuid,
  p_employer_contact_id uuid
)
returns boolean
language sql stable
set search_path = ''
as $$
  with person_consents as (
    select c.*
    from public.communication_consents c
    where c.channel = p_channel
      and c.deleted_at is null
      and (c.candidate_id = p_candidate_id or c.employer_contact_id = p_employer_contact_id)
  )
  select case p_channel
    when 'sms' then exists (
      select 1 from person_consents where consent_given and withdrawn_at is null)
    when 'email' then
      exists (select 1 from person_consents where consent_given and withdrawn_at is null)
      or not exists (select 1 from person_consents where withdrawn_at is not null)
    else false
  end
$$;

-- Records a STOP (or any opt-out): withdraws every live opt-in for the person
-- on that channel, and if there was none, writes a withdrawal record so the
-- refusal is on file anyway.
create function public.record_opt_out(
  p_channel text,
  p_candidate_id uuid,
  p_employer_contact_id uuid,
  p_source text,
  p_source_detail text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  withdrawn integer;
begin
  update public.communication_consents
     set withdrawn_at = now()
   where channel = p_channel
     and consent_given
     and withdrawn_at is null
     and deleted_at is null
     and (candidate_id = p_candidate_id or employer_contact_id = p_employer_contact_id);
  get diagnostics withdrawn = row_count;

  if withdrawn = 0 then
    insert into public.communication_consents (
      candidate_id, employer_contact_id, channel, consent_given, withdrawn_at,
      source, source_detail
    ) values (
      p_candidate_id, p_employer_contact_id, p_channel, false, now(),
      p_source, p_source_detail
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Templates and the message log.
-- -----------------------------------------------------------------------------
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  channel text not null default 'email' check (channel in ('email', 'sms')),
  subject text,
  body text not null,
  -- The merge fields the body may use, e.g. {candidate_first_name}.
  merge_fields text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint email_templates_email_has_subject check (channel <> 'email' or subject is not null)
);

create index email_templates_created_by_idx on public.email_templates (created_by);
create index email_templates_deleted_at_idx on public.email_templates (deleted_at);
call private.attach_standard_triggers('public.email_templates');

create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.email_templates (id) on delete restrict,
  channel text not null check (channel in ('email', 'sms')),
  candidate_id uuid references public.candidates (id) on delete restrict,
  employer_contact_id uuid references public.employer_contacts (id) on delete restrict,
  to_address text not null,
  subject text,
  body text,
  merge_data jsonb not null default '{}',
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  provider text,
  provider_message_id text,
  error text,
  sent_by uuid references public.profiles (id) on delete restrict,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint message_log_one_person
    check (num_nonnulls(candidate_id, employer_contact_id) = 1),
  constraint message_log_provider_id_unique unique (provider, provider_message_id)
);

create index message_log_template_id_idx on public.message_log (template_id);
create index message_log_candidate_id_idx on public.message_log (candidate_id, created_at desc);
create index message_log_employer_contact_id_idx on public.message_log (employer_contact_id, created_at desc);
create index message_log_delivery_status_idx on public.message_log (delivery_status)
  where delivery_status in ('queued', 'sent');
create index message_log_sent_by_idx on public.message_log (sent_by);
create index message_log_created_by_idx on public.message_log (created_by);
create index message_log_deleted_at_idx on public.message_log (deleted_at);
call private.attach_standard_triggers('public.message_log');

-- No message is logged for sending without consent - for every caller,
-- service_role included, because the check is a trigger rather than a policy.
-- Security definer so the check sees every consent row regardless of who
-- is asking.
create function private.enforce_message_consent()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.can_send_message(new.channel, new.candidate_id, new.employer_contact_id) then
    raise exception 'no % consent on file for this person: message refused', new.channel
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_message_consent
  before insert on public.message_log
  for each row execute function private.enforce_message_consent();

-- -----------------------------------------------------------------------------
-- Content, for when the client edits the site themselves. The 40 imported
-- articles stay in the repo; nothing is migrated into this table here.
--
-- author_id is the workflow owner of a draft, NOT a byline. The site names
-- nobody (CLAUDE.md, "Content rules"), and nothing here may be rendered as
-- one. Approval takes a second person: a piece cannot be approved or
-- published with no reviewer, or with its author as the reviewer.
-- -----------------------------------------------------------------------------
create table public.content (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('article', 'faq', 'guide', 'page')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  body jsonb not null default '[]',
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'published', 'archived')),
  author_id uuid references public.profiles (id) on delete restrict,
  reviewer_id uuid references public.profiles (id) on delete restrict,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  canonical_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint content_published_is_dated check (status <> 'published' or published_at is not null),
  constraint content_four_eyes check (
    status not in ('approved', 'published')
    or (reviewer_id is not null and reviewer_id is distinct from author_id)
  )
);

create unique index content_type_slug_idx on public.content (type, slug) where deleted_at is null;
create index content_status_idx on public.content (status);
create index content_author_id_idx on public.content (author_id);
create index content_reviewer_id_idx on public.content (reviewer_id);
create index content_created_by_idx on public.content (created_by);
create index content_deleted_at_idx on public.content (deleted_at);
call private.attach_standard_triggers('public.content');
