-- =============================================================================
-- 6. CANDIDATE ERASURE
--
-- /privacy-policy tells candidates their data can be deleted on request. Until
-- this migration nothing could honour that: no role may hard-delete, and the
-- audit log kept a full copy of every row ever written, forever.
--
-- A REQUEST IS NOT A DELETION. deletion_requests records what was asked, by
-- whom, how it was verified and what was decided. Erasure happens later, out
-- of band, when public.process_due_deletion_requests() reaches the request.
-- Until then the request can be cancelled and nothing has been destroyed.
--
-- DELETION IS NOT UNCONDITIONAL. A US staffing agency must keep applicant
-- and referral records for a period, and longer while a charge is pending:
--
--   29 CFR 1627.4(a)   ADEA. Employment agencies keep placements, referrals,
--                      job orders, applications and resumes "for a period of
--                      1 year from the date of the action to which the
--                      records relate".
--   29 CFR 1602.14     Title VII / ADA / GINA. One year from the record or the
--                      personnel action, whichever is later; until final
--                      disposition once a charge is filed.
--   Cal. Gov. Code     FEHA. Employers AND employment agencies keep
--     section 12946    applications and employment referral records for four
--                      years, and through any complaint.
--   41 CFR 60-1.12(a)  OFCCP. Two years (one below 150 employees or a
--                      $150,000 contract) - only for a covered federal
--                      contractor or subcontractor. Not active: CLIENT-CONFIRM.md
--                      item 19.
--
-- CCPA/CPRA lets a business keep what it must keep: Cal. Civ. Code
-- 1798.105(d)(8), "comply with a legal obligation", and 1798.145(a)(1)(A).
-- The applicant exemption expired on 1 January 2023, so applicants are
-- covered. The regulations then require the business to (11 CCR 7022(f))
-- delete what the exception does not cover, and not use what it keeps for
-- any other purpose; and to keep a record of each request and the response
-- for at least 24 months (11 CCR 7101).
--
-- So an accepted request is either SCHEDULED (nothing has to be kept: erase
-- at execute_after) or DEFERRED (records are under a retention floor: erase
-- what is not covered at execute_after, restrict the rest, and erase it
-- automatically at deferred_until). A legal hold defers without a date.
-- REFUSED is reserved for a request that cannot be honoured at all, such as
-- one whose requester could not be verified. Deferral is not refusal.
--
-- What happens to each table, and why, is in supabase/ERASURE.md.
-- =============================================================================

-- =============================================================================
-- A. The audit log stops collecting personal data.
--
-- private.audit_row() used to store to_jsonb(old) and to_jsonb(new) whole,
-- plus the caller's IP address and user agent. audit_log is append-only for
-- every role, so a candidate's name, email, phone, notes about them and the IP
-- they applied from would have outlived any erasure. Worse, the erasure itself
-- would have written every value it removed into the log on its way out.
--
-- Now every string, array, JSON and network column is redacted from the
-- logged row unless private.column_classification marks it non-personal. An
-- unclassified column is redacted, so a column added later fails safe; the
-- catalog test in 00_schema.test.sql fails until someone classifies it. The
-- log still records that a personal column changed - by name, never value.
-- IP address and user agent are recorded for staff only.
-- =============================================================================

create table private.column_classification (
  table_name text not null,
  column_name text not null,
  personal boolean not null,
  primary key (table_name, column_name)
);
revoke all on private.column_classification from public, anon, authenticated;

-- Every string-like column of every audited table, decided one by one.
insert into private.column_classification (table_name, column_name, personal) values
  ('activities', 'subject_type', false),
  ('activities', 'kind', false),
  ('activities', 'direction', false),
  ('activities', 'subject_line', true ),
  ('activities', 'body', true ),
  ('activities', 'outcome', true ),
  ('activities', 'next_action', true ),
  ('applications', 'source', false),
  ('applications', 'cover_note', true ),
  ('applications', 'status', false),
  ('candidate_documents', 'kind', false),
  ('candidate_documents', 'storage_path', true ),
  ('candidate_documents', 'original_filename', true ),
  ('candidate_documents', 'mime_type', false),
  ('candidate_embeddings', 'model_name', false),
  ('candidate_engagement_types', 'engagement_type', false),
  ('candidates', 'full_name', true ),
  ('candidates', 'email', true ),
  ('candidates', 'email_normalized', true ),
  ('candidates', 'phone', true ),
  ('candidates', 'city', true ),
  ('candidates', 'state', false),
  ('candidates', 'desk', false),
  ('candidates', 'specialty', false),
  ('candidates', 'expected_salary_unit', false),
  ('candidates', 'linkedin_url', true ),
  ('candidates', 'status', false),
  ('candidates', 'source', false),
  ('communication_consents', 'channel', false),
  ('communication_consents', 'address', true ),
  ('communication_consents', 'source', false),
  ('communication_consents', 'source_detail', true ),
  ('contact_messages', 'full_name', true ),
  ('contact_messages', 'email', true ),
  ('contact_messages', 'email_normalized', true ),
  ('contact_messages', 'phone', true ),
  ('contact_messages', 'enquiry_type', false),
  ('contact_messages', 'subject', true ),
  ('contact_messages', 'message', true ),
  ('contact_messages', 'status', false),
  ('content', 'type', false),
  ('content', 'slug', false),
  ('content', 'title', false),
  ('content', 'summary', false),
  ('content', 'body', false),
  ('content', 'status', false),
  ('content', 'seo_title', false),
  ('content', 'seo_description', false),
  ('content', 'canonical_url', false),
  ('email_templates', 'slug', false),
  ('email_templates', 'name', false),
  ('email_templates', 'channel', false),
  ('email_templates', 'subject', false),
  ('email_templates', 'body', false),
  ('email_templates', 'merge_fields', false),
  ('employer_contacts', 'full_name', true ),
  ('employer_contacts', 'title', true ),
  ('employer_contacts', 'email', true ),
  ('employer_contacts', 'email_normalized', true ),
  ('employer_contacts', 'phone', true ),
  ('employers', 'company_name', false),
  ('employers', 'company_name_normalized', false),
  ('employers', 'website', false),
  ('employers', 'industry', false),
  ('employers', 'size_band', false),
  ('employers', 'address_line1', false),
  ('employers', 'address_line2', false),
  ('employers', 'city', false),
  ('employers', 'state', false),
  ('employers', 'postal_code', false),
  ('employers', 'status', false),
  ('employers', 'notes', true ),
  ('interviews', 'mode', false),
  ('interviews', 'location_or_link', true ),
  ('interviews', 'interviewer_names', true ),
  ('interviews', 'status', false),
  ('interviews', 'outcome', true ),
  ('interviews', 'feedback', true ),
  ('jobs', 'slug', false),
  ('jobs', 'title', false),
  ('jobs', 'public_description', false),
  ('jobs', 'desk', false),
  ('jobs', 'specialty', false),
  ('jobs', 'engagement_type', false),
  ('jobs', 'work_mode', false),
  ('jobs', 'city', false),
  ('jobs', 'state', false),
  ('jobs', 'salary_unit', false),
  ('jobs', 'salary_currency', false),
  ('jobs', 'status', false),
  ('jobs', 'canonical_url', false),
  ('jobs', 'seo_title', false),
  ('jobs', 'seo_description', false),
  ('leads', 'source', false),
  ('leads', 'source_url', true ),
  ('leads', 'contact_name', true ),
  ('leads', 'contact_title', true ),
  ('leads', 'contact_email', true ),
  ('leads', 'contact_email_normalized', true ),
  ('leads', 'contact_phone', true ),
  ('leads', 'company_name', false),
  ('leads', 'company_name_normalized', false),
  ('leads', 'role_title', false),
  ('leads', 'requested_service', false),
  ('leads', 'engagement_type', false),
  ('leads', 'desk', false),
  ('leads', 'specialty', false),
  ('leads', 'city', false),
  ('leads', 'state', false),
  ('leads', 'work_mode', false),
  ('leads', 'salary_unit', false),
  ('leads', 'salary_currency', false),
  ('leads', 'urgency', false),
  ('leads', 'submitted_details', true ),
  ('leads', 'notes', true ),
  ('leads', 'status', false),
  ('leads', 'closed_reason', true ),
  ('message_log', 'channel', false),
  ('message_log', 'to_address', true ),
  ('message_log', 'subject', true ),
  ('message_log', 'body', true ),
  ('message_log', 'merge_data', true ),
  ('message_log', 'delivery_status', false),
  ('message_log', 'provider', false),
  ('message_log', 'provider_message_id', false),
  ('message_log', 'error', true ),
  ('offers', 'salary_unit', false),
  ('offers', 'status', false),
  ('offers', 'decline_reason', true ),
  ('placements', 'status', false),
  ('placements', 'fee_basis_notes', true ),
  ('profiles', 'full_name', true ),
  ('profiles', 'email', true ),
  ('requisitions', 'title', false),
  ('requisitions', 'desk', false),
  ('requisitions', 'specialty', false),
  ('requisitions', 'engagement_type', false),
  ('requisitions', 'work_mode', false),
  ('requisitions', 'city', false),
  ('requisitions', 'state', false),
  ('requisitions', 'salary_unit', false),
  ('requisitions', 'salary_currency', false),
  ('requisitions', 'description', false),
  ('requisitions', 'internal_notes', true ),
  ('requisitions', 'status', false),
  ('requisitions', 'closed_reason', true ),
  ('resume_submissions', 'full_name', true ),
  ('resume_submissions', 'email', true ),
  ('resume_submissions', 'email_normalized', true ),
  ('resume_submissions', 'phone', true ),
  ('resume_submissions', 'city', true ),
  ('resume_submissions', 'state', false),
  ('resume_submissions', 'linkedin_url', true ),
  ('resume_submissions', 'message', true ),
  ('resume_submissions', 'desk', false),
  ('resume_submissions', 'specialty', false),
  ('resume_submissions', 'engagement_types', false),
  ('resume_submissions', 'resume_storage_path', true ),
  ('resume_submissions', 'resume_filename', true ),
  ('resume_submissions', 'resume_mime_type', false),
  ('resume_submissions', 'status', false),
  ('submission_events', 'event_type', false),
  ('submission_events', 'from_status', false),
  ('submission_events', 'to_status', false),
  ('submission_events', 'notes', true ),
  ('submissions', 'bdm_decision', false),
  ('submissions', 'bdm_notes', true ),
  ('submissions', 'employer_response', true ),
  ('submissions', 'rate_unit', false),
  ('submissions', 'status', false);

create or replace function private.audit_row()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  old_json jsonb;
  new_json jsonb;
  audit_action text := tg_op;
  redact text[];
  touched text[];
  staff boolean := private.is_staff();
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

  -- Redact every string-like column not explicitly classified non-personal.
  select coalesce(array_agg(a.attname::text), '{}')
    into redact
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = tg_relid
    and a.attnum > 0
    and not a.attisdropped
    and (t.typcategory in ('S', 'A', 'I') or t.typname in ('json', 'jsonb'))
    and not exists (
      select 1 from private.column_classification c
      where c.table_name = tg_table_name
        and c.column_name = a.attname
        and not c.personal
    );

  -- Which of those this change touched: names only.
  select coalesce(array_agg(k order by k), '{}')
    into touched
  from unnest(redact) as k
  where coalesce(old_json -> k, 'null'::jsonb) is distinct from coalesce(new_json -> k, 'null'::jsonb);

  old_json := old_json - redact;
  new_json := new_json - redact;
  if cardinality(touched) > 0 then
    if new_json is not null then
      new_json := new_json || jsonb_build_object('_personal_columns', to_jsonb(touched));
    else
      old_json := old_json || jsonb_build_object('_personal_columns', to_jsonb(touched));
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
    case when staff then private.request_ip() end,
    case when staff then private.request_header('user-agent') end,
    auth.uid()
  );
  return null;
end;
$$;

-- =============================================================================
-- B. Candidates can be erased in place.
--
-- The row itself survives as a tombstone: submissions, offers and placements
-- are the employer's transaction with Talentrax and keep pointing at it. Once
-- erased_at is set, the CHECK below makes it impossible for the row to carry
-- anything that identifies the person - for every role, service_role
-- included, because a CHECK binds the table, not the caller.
-- =============================================================================

alter table public.candidates add column erased_at timestamptz;
alter table public.candidates alter column full_name drop not null;
alter table public.candidates
  add constraint candidates_full_name_present
    check (erased_at is not null or full_name is not null),
  add constraint candidates_erased_holds_no_personal_data check (
    erased_at is null or (
      full_name is null and email is null and phone is null and city is null
      and state is null and linkedin_url is null and expected_salary is null
      and expected_salary_unit is null and work_authorized is null
      and desk is null and specialty is null and profile_id is null
      and deleted_at is not null
    )
  );

-- =============================================================================
-- C. Retention rules. One row per obligation, with its citation. The floor
-- for a candidate is the latest action on any of their records plus the
-- longest active rule that applies to them. Only a super_admin edits these.
-- state NULL means the rule applies everywhere; a state code means it applies
-- when the candidate, or a job or requisition they are linked to, is there.
-- =============================================================================

create table public.retention_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  state char(2) references public.us_states (code) on update restrict on delete restrict,
  retention_period interval not null check (retention_period >= interval '0'),
  is_active boolean not null default true,
  citation text not null,
  scope_note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict
);
create index retention_rules_state_idx on public.retention_rules (state);
create index retention_rules_created_by_idx on public.retention_rules (created_by);
call private.attach_standard_triggers('public.retention_rules');

insert into public.retention_rules (code, state, retention_period, is_active, citation, scope_note) values
  ('adea-employment-agency', null, interval '1 year', true,
   '29 CFR 1627.4(a)',
   'ADEA: employment agencies keep placements, referrals, job orders, applications and resumes for one year from the action they relate to.'),
  ('title-vii-ada-gina', null, interval '1 year', true,
   '29 CFR 1602.14',
   'Title VII, ADA, GINA: personnel and employment records for one year from the record or the personnel action, whichever is later.'),
  ('ca-feha', 'CA', interval '4 years', true,
   'Cal. Gov. Code section 12946',
   'FEHA: employers and employment agencies keep applications and employment referral records for four years. Applied when the candidate, or a job or requisition they are linked to, is in California. If Talentrax itself operates from California, this may apply to every candidate: CLIENT-CONFIRM.md item 20.'),
  ('ofccp-federal-contractor', null, interval '2 years', false,
   '41 CFR 60-1.12(a)',
   'OFCCP: two years for covered federal contractors and subcontractors (one year below 150 employees or a $150,000 contract), internet applicant records included. Inactive until the client confirms whether it holds a covered contract: CLIENT-CONFIRM.md item 19.');

-- =============================================================================
-- D. Legal holds. While one is live for a candidate, nothing of theirs is
-- erased, whatever the floor says: the regulations above all extend
-- retention to the final disposition of a charge or action.
-- =============================================================================

create table public.legal_holds (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  reason text not null check (reason in (
    'eeoc_charge', 'state_agency_complaint', 'ofccp_review', 'litigation', 'subpoena', 'other'
  )),
  -- The charge or case number. Personal: it can be looked up to the person.
  matter_reference text,
  placed_at timestamptz not null default now(),
  placed_by uuid not null references public.profiles (id) on delete restrict,
  released_at timestamptz,
  released_by uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  constraint legal_holds_release_is_dated check ((released_at is null) = (released_by is null))
);
create index legal_holds_candidate_id_idx on public.legal_holds (candidate_id) where released_at is null;
create index legal_holds_candidate_all_idx on public.legal_holds (candidate_id);
create index legal_holds_placed_by_idx on public.legal_holds (placed_by);
create index legal_holds_released_by_idx on public.legal_holds (released_by);
create index legal_holds_created_by_idx on public.legal_holds (created_by);
create index legal_holds_deleted_at_idx on public.legal_holds (deleted_at);
call private.attach_standard_triggers('public.legal_holds');

-- =============================================================================
-- E. Deletion requests. The request record, and the work queue.
--
-- It holds no personal data: candidate_id points at a row that will be a
-- tombstone, every other column is a date, a staff id or a fixed code. That
-- is what lets it outlive the erasure, as 11 CCR 7101 requires (24 months),
-- without being a copy of what was erased. No deleted_at: a request record
-- is never removed.
--
--   requested  recorded, not yet verified or decided.        cancellable
--   scheduled  accepted, nothing must be kept; erases at
--              execute_after.                                 cancellable
--   deferred   accepted, records are under a retention floor
--              or a legal hold. At execute_after what is not
--              covered is erased (partially_executed_at);
--              the rest goes at deferred_until, or when the
--              hold is released. deferred_until NULL = hold.  cancellable
--                                                             until partial
--   executed   erased.                                        final
--   refused    cannot be honoured (refusal_basis).            final
--   cancelled  withdrawn before anything was erased.          final
--
-- From scheduled or deferred onwards the candidate is RESTRICTED: hidden from
-- all staff but administrators, and no new application, submission, document,
-- message or opt-in can be created for them (11 CCR 7022(f)(3)).
-- =============================================================================

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  status text not null default 'requested' check (status in (
    'requested', 'scheduled', 'deferred', 'executed', 'refused', 'cancelled'
  )),
  manner text not null check (manner in (
    'self_service', 'email', 'phone', 'mail', 'in_person', 'authorized_agent'
  )),
  requested_at timestamptz not null default now(),
  requested_by uuid references public.profiles (id) on delete restrict,
  verification_method text check (verification_method in (
    'signed_in_account', 'email_confirmation', 'identity_documents', 'agent_authorization', 'other'
  )),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete restrict,
  execute_after timestamptz,
  deferred_until timestamptz,
  -- Rule codes from retention_rules, or 'legal_hold'. What the candidate is
  -- told is keeping their records.
  deferral_basis text[] not null default '{}',
  partially_executed_at timestamptz,
  executed_at timestamptz,
  refused_at timestamptz,
  refused_by uuid references public.profiles (id) on delete restrict,
  refusal_basis text check (refusal_basis in (
    'identity_not_verified', 'agent_not_authorized', 'no_matching_record', 'duplicate_request'
  )),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete restrict,
  -- Failure bookkeeping. A SQLSTATE only: an error message can quote a value.
  attempts integer not null default 0 check (attempts >= 0),
  last_error_state text check (last_error_state ~ '^[0-9A-Z]{5}$'),
  last_error_at timestamptz,
  -- Row counts per table, written at each execution step. Counts, no values.
  erasure_summary jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,

  constraint deletion_requests_accepted_is_dated check (
    status not in ('scheduled', 'deferred', 'executed')
    or (accepted_at is not null and execute_after is not null and verification_method is not null)
  ),
  constraint deletion_requests_executed_is_dated
    check ((status = 'executed') = (executed_at is not null)),
  constraint deletion_requests_refusal_is_dated check (
    (status = 'refused') = (refused_at is not null and refusal_basis is not null)
  ),
  constraint deletion_requests_cancel_is_dated
    check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint deletion_requests_cancel_before_erasure
    check (status <> 'cancelled' or partially_executed_at is null),
  constraint deletion_requests_partial_only_when_deferred check (
    partially_executed_at is null or status in ('deferred', 'executed')
  )
);

-- One open request per candidate.
create unique index deletion_requests_one_open_idx
  on public.deletion_requests (candidate_id)
  where status in ('requested', 'scheduled', 'deferred');
create index deletion_requests_candidate_id_idx on public.deletion_requests (candidate_id);
create index deletion_requests_due_idx on public.deletion_requests (status, execute_after)
  where status in ('scheduled', 'deferred');
create index deletion_requests_requested_by_idx on public.deletion_requests (requested_by);
create index deletion_requests_accepted_by_idx on public.deletion_requests (accepted_by);
create index deletion_requests_refused_by_idx on public.deletion_requests (refused_by);
create index deletion_requests_cancelled_by_idx on public.deletion_requests (cancelled_by);
create index deletion_requests_created_by_idx on public.deletion_requests (created_by);
call private.attach_standard_triggers('public.deletion_requests');

-- =============================================================================
-- F. Storage erasures: the transactional outbox for the bytes.
--
-- Resumes and their scrubbed copies live in Supabase Storage, outside
-- Postgres, and Supabase refuses direct deletes from storage.objects. So the
-- database erasure and the storage erasure cannot be one transaction. The
-- erasure writes one row here per object IN THE SAME TRANSACTION that removes
-- the metadata; a worker deletes the object through the Storage API and
-- marks the row done. Either both the metadata removal and its outbox rows
-- commit, or neither does, so the bytes are never deleted while the
-- database still points at them. The only divergence possible is bytes that
-- outlive their row until the worker succeeds - a pending row here says
-- exactly which. A 404 from Storage counts as done: the delete is idempotent.
-- =============================================================================

create table public.storage_erasures (
  id uuid primary key default gen_random_uuid(),
  deletion_request_id uuid not null references public.deletion_requests (id) on delete restrict,
  source_table text not null check (source_table in ('candidate_documents', 'resume_submissions')),
  -- The object key as the source row stored it. Personal (a filename can be
  -- a name), so it is cleared when the object is confirmed gone.
  object_path text,
  status text not null default 'pending' check (status in ('pending', 'done')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_state text check (last_error_state ~ '^[0-9A-Za-z_]{1,40}$'),
  last_attempt_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete restrict,
  constraint storage_erasures_done_is_cleared check (
    (status = 'done') = (completed_at is not null)
    and (status = 'pending') = (object_path is not null)
  )
);
create index storage_erasures_deletion_request_id_idx on public.storage_erasures (deletion_request_id);
create index storage_erasures_pending_idx on public.storage_erasures (created_at) where status = 'pending';
create index storage_erasures_created_by_idx on public.storage_erasures (created_by);
call private.attach_standard_triggers('public.storage_erasures');

-- The new tables' own string columns.
insert into private.column_classification (table_name, column_name, personal) values
  ('retention_rules', 'code', false),
  ('retention_rules', 'state', false),
  ('retention_rules', 'citation', false),
  ('retention_rules', 'scope_note', false),
  ('legal_holds', 'reason', false),
  ('legal_holds', 'matter_reference', true),
  ('deletion_requests', 'status', false),
  ('deletion_requests', 'manner', false),
  ('deletion_requests', 'verification_method', false),
  ('deletion_requests', 'deferral_basis', false),
  ('deletion_requests', 'refusal_basis', false),
  ('deletion_requests', 'last_error_state', false),
  ('deletion_requests', 'erasure_summary', false),
  ('storage_erasures', 'source_table', false),
  ('storage_erasures', 'object_path', true),
  ('storage_erasures', 'status', false),
  ('storage_erasures', 'last_error_state', false);

-- =============================================================================
-- G. Helpers.
-- =============================================================================

-- The candidate an erasure in this transaction is acting on, or NULL.
-- The erasure sets talentrax.erasure_request; this resolves it only to a
-- request that is actually accepted and open. The triggers that relax an
-- append-only or frozen table do so only for that candidate's rows and only
-- to remove data, so a forged setting can at worst erase notes on a candidate
-- whose erasure has already been accepted.
create function private.erasure_candidate()
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare
  raw text := nullif(current_setting('talentrax.erasure_request', true), '');
  result uuid;
begin
  if raw is null or raw !~ '^[0-9a-f-]{36}$' then
    return null;
  end if;
  select r.candidate_id into result
  from public.deletion_requests r
  where r.id = raw::uuid and r.status in ('scheduled', 'deferred');
  return result;
end;
$$;

-- Restricted: an accepted request is open. 11 CCR 7022(f)(3).
create function private.is_restricted_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.deletion_requests r
    where r.candidate_id = target and r.status in ('scheduled', 'deferred')
  )
$$;

create function private.has_active_hold(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.legal_holds h
    where h.candidate_id = target and h.released_at is null and h.deleted_at is null
  )
$$;

-- The retention floor: latest action on any of the candidate's records plus
-- the longest active rule that applies to them, with the codes of every
-- rule that applies. NULL floor when no active rule applies.
create function private.retention_floor(target uuid, out retain_until timestamptz, out basis text[])
language plpgsql stable security definer
set search_path = ''
as $$
declare
  latest timestamptz;
  longest interval;
begin
  with cand as (
    select c.* from public.candidates c where c.id = target
  ),
  subs as (
    select s.* from public.submissions s where s.candidate_id = target
  ),
  apps as (
    select a.* from public.applications a where a.candidate_id = target
  ),
  intake as (
    select rs.* from public.resume_submissions rs
    where rs.candidate_id = target
       or (rs.email_normalized is not null
           and rs.email_normalized = (select email_normalized from cand))
  ),
  dates(d) as (
    select greatest(created_at, updated_at) from cand
    union all select greatest(created_at, updated_at) from intake
    union all select greatest(created_at, updated_at) from apps
    union all select greatest(created_at, updated_at, sent_to_employer_at, employer_response_at) from subs
    union all select e.occurred_at from public.submission_events e join subs on subs.id = e.submission_id
    union all select greatest(i.created_at, i.updated_at, i.scheduled_at) from public.interviews i join subs on subs.id = i.submission_id
    union all select greatest(o.created_at, o.updated_at, o.responded_at) from public.offers o join subs on subs.id = o.submission_id
    union all select greatest(p.created_at, p.updated_at, p.end_date::timestamptz) from public.placements p where p.candidate_id = target
    union all select greatest(d.created_at, d.updated_at) from public.candidate_documents d where d.candidate_id = target
    union all select greatest(t.created_at, t.updated_at) from public.candidate_engagement_types t where t.candidate_id = target
    union all select greatest(m.created_at, m.updated_at) from public.message_log m where m.candidate_id = target
  ),
  places(state) as (
    select state from cand
    union select state from intake
    union select j.state from apps join public.jobs j on j.id = apps.job_id
    union select r.state from subs join public.requisitions r on r.id = subs.requisition_id
  ),
  rules as (
    select rr.code, rr.retention_period from public.retention_rules rr
    where rr.is_active
      and (rr.state is null or rr.state in (select state from places where state is not null))
  )
  select (select max(d) from dates),
         (select max(retention_period) from rules),
         (select coalesce(array_agg(code order by code), '{}') from rules)
    into latest, longest, basis;

  if longest is null or latest is null then
    retain_until := null;
    basis := '{}';
  else
    retain_until := latest + longest;
  end if;
end;
$$;

-- =============================================================================
-- H. Restriction: nothing new for a restricted candidate.
-- An opt-out (consent_given = false) is still accepted: stopping contact is
-- the one thing a restriction must allow.
-- =============================================================================

create function private.refuse_if_restricted()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if tg_table_name in ('interviews', 'offers') then
    select s.candidate_id into target from public.submissions s where s.id = new.submission_id;
  else
    target := new.candidate_id;
  end if;
  -- Nested, not ANDed: PL/pgSQL does not promise to short-circuit, and only
  -- this table has the column.
  if tg_table_name = 'communication_consents' then
    if not new.consent_given then
      return new;
    end if;
  end if;
  if target is not null and private.is_restricted_candidate(target) then
    raise exception 'this candidate has an accepted deletion request: % refused', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'applications', 'submissions', 'interviews', 'offers', 'candidate_documents',
    'candidate_embeddings', 'candidate_engagement_types', 'message_log', 'communication_consents'
  ] loop
    execute format(
      'create trigger refuse_if_restricted before insert on public.%I
         for each row execute function private.refuse_if_restricted()', t);
  end loop;
end;
$$;

-- Visibility: a restricted candidate is visible to themselves and to
-- administrators, and to no other staff. Same bodies as migration 5 plus the
-- one condition.
create or replace function private.can_manage_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or (
        private.has_role('recruiter', 'full_desk_recruiter')
        and not private.is_restricted_candidate(target)
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

create or replace function private.staff_can_read_candidate(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.can_manage_candidate(target)
      or (
        private.has_role('bdm')
        and not private.is_restricted_candidate(target)
        and exists (
          select 1 from public.submissions s
          where s.candidate_id = target
            and s.deleted_at is null
            and (s.bdm_id = private.current_profile_id()
                 or private.can_manage_requisition(s.requisition_id))
        )
      )
$$;

create or replace function private.can_read_submission(target uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin()
      or exists (
        select 1 from public.submissions s
        where s.id = target
          and s.deleted_at is null
          and not private.is_restricted_candidate(s.candidate_id)
          and (
            (private.has_role('recruiter', 'full_desk_recruiter')
             and s.submitted_by = private.current_profile_id())
            or (private.has_role('bdm')
                and (s.bdm_id = private.current_profile_id()
                     or private.can_manage_requisition(s.requisition_id)))
          )
      )
$$;

-- =============================================================================
-- I. The two places an erasure must reach that were built never to change.
-- =============================================================================

-- The timeline must not record the erasure's own edits as events: nulling
-- employer_response is not an employer responding.
create or replace function private.submission_timeline()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if new.candidate_id = private.erasure_candidate() then
    return null;
  end if;

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

-- The timeline stays append-only, with one exception: an erasure may clear
-- the free-text notes of its own candidate's events. Nothing else about an
-- event can change, and nothing can be deleted.
create function private.guard_submission_event()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.notes is null
     and (to_jsonb(new) - array['notes', 'updated_at']) = (to_jsonb(old) - array['notes', 'updated_at'])
     and exists (
       select 1 from public.submissions s
       where s.id = old.submission_id and s.candidate_id = private.erasure_candidate()
     ) then
    return new;
  end if;
  raise exception '% is append-only: % is not permitted', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger submission_events_append_only on public.submission_events;
create trigger submission_events_append_only
  before update or delete on public.submission_events
  for each row execute function private.guard_submission_event();

-- =============================================================================
-- J. The erasure steps. Owned by the migration role, which owns the tables;
-- reached only through process_due_deletion_requests(). Each step is
-- idempotent: running it twice erases nothing twice and fails on nothing.
-- =============================================================================

-- Step 1 for a deferred request: what no retention rule covers.
-- Embeddings are derived from the documents, regenerable, and not a record of
-- any employment action; nothing obliges keeping them.
create function private.erase_unretained(req public.deletion_requests)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.candidate_embeddings where candidate_id = req.candidate_id;
  get diagnostics n = row_count;
  return jsonb_build_object('candidate_embeddings', n);
end;
$$;

-- The final step: everything. See supabase/ERASURE.md for why each table is
-- erased, anonymised or left alone.
create function private.erase_candidate(req public.deletion_requests)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  c uuid := req.candidate_id;
  cand public.candidates;
  account public.profiles;
  summary jsonb := '{}';
  n integer;
  n_originals integer;
  app_ids uuid[];
  sub_ids uuid[];
  interview_ids uuid[];
  offer_ids uuid[];
  placement_ids uuid[];
  intake_ids uuid[];
begin
  select * into cand from public.candidates where id = c for update;
  if cand.erased_at is not null then
    return jsonb_build_object('already_erased', true);
  end if;

  select coalesce(array_agg(id), '{}') into app_ids from public.applications where candidate_id = c;
  select coalesce(array_agg(id), '{}') into sub_ids from public.submissions where candidate_id = c;
  select coalesce(array_agg(id), '{}') into interview_ids from public.interviews where submission_id = any (sub_ids);
  select coalesce(array_agg(id), '{}') into offer_ids from public.offers where submission_id = any (sub_ids);
  select coalesce(array_agg(id), '{}') into placement_ids from public.placements where candidate_id = c;
  select coalesce(array_agg(id), '{}') into intake_ids from public.resume_submissions
   where candidate_id = c
      or (email_normalized is not null and email_normalized = cand.email_normalized);

  -- The bytes, queued in this transaction (see storage_erasures).
  insert into public.storage_erasures (deletion_request_id, source_table, object_path)
  select req.id, 'candidate_documents', d.storage_path
  from public.candidate_documents d where d.candidate_id = c
  union all
  select req.id, 'resume_submissions', rs.resume_storage_path
  from public.resume_submissions rs
  where rs.id = any (intake_ids) and rs.resume_storage_path is not null;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('storage_objects_queued', n);

  -- Erased: rows that exist only because of the candidate.
  delete from public.candidate_embeddings where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('candidate_embeddings', n);

  delete from public.activities
  where (subject_type = 'candidate' and subject_id = c)
     or (subject_type = 'application' and subject_id = any (app_ids))
     or (subject_type = 'submission' and subject_id = any (sub_ids))
     or (subject_type = 'interview' and subject_id = any (interview_ids))
     or (subject_type = 'offer' and subject_id = any (offer_ids))
     or (subject_type = 'placement' and subject_id = any (placement_ids));
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('activities', n);

  delete from public.message_log where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('message_log', n);

  delete from public.communication_consents where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('communication_consents', n);

  delete from public.candidate_engagement_types where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('candidate_engagement_types', n);

  delete from public.resume_submissions where id = any (intake_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('resume_submissions', n);

  -- Anonymised in place: the employer's transaction with Talentrax.
  -- Detach what is about to be deleted, and clear the free text about the
  -- person. Consent flags, dates, rate and status stay: they are the
  -- evidence that the gate held.
  update public.submissions
     set bdm_notes = null,
         employer_response = null,
         shared_document_id = null,
         application_id = null
   where candidate_id = c;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('submissions_anonymised', n);

  update public.submission_events
     set notes = null
   where submission_id = any (sub_ids) and notes is not null;
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('submission_events_anonymised', n);

  update public.interviews
     set location_or_link = null, outcome = null, feedback = null
   where id = any (interview_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('interviews_anonymised', n);

  update public.offers set decline_reason = null where id = any (offer_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('offers_anonymised', n);

  -- Placements are left alone: no column of theirs identifies the person.
  summary := summary || jsonb_build_object('placements_kept', cardinality(placement_ids));

  -- Erased, now that nothing references them.
  delete from public.applications where id = any (app_ids);
  get diagnostics n = row_count;
  summary := summary || jsonb_build_object('applications', n);

  -- Scrubbed versions first: they reference their original.
  delete from public.candidate_documents where candidate_id = c and not is_original;
  get diagnostics n = row_count;
  delete from public.candidate_documents where candidate_id = c;
  get diagnostics n_originals = row_count;
  summary := summary || jsonb_build_object('candidate_documents', n + n_originals);

  -- The account, if the candidate registered one. Staff accounts are never
  -- touched by a candidate erasure.
  if cand.profile_id is not null then
    select * into account from public.profiles where id = cand.profile_id for update;
    if account.role = 'job_seeker' then
      update public.profiles
         set full_name = null, email = null, is_active = false, deleted_at = now()
       where id = account.id;
      update auth.users
         set email = null, phone = null, encrypted_password = '',
             raw_user_meta_data = '{}', raw_app_meta_data = '{}',
             email_change = '', phone_change = '', confirmation_token = '',
             recovery_token = '', email_change_token_new = '',
             email_change_token_current = '', phone_change_token = '',
             reauthentication_token = '', banned_until = 'infinity', deleted_at = now()
       where id = account.id;
      delete from auth.identities where user_id = account.id;
      delete from auth.sessions where user_id = account.id;
      delete from auth.refresh_tokens where user_id = account.id::text;
      delete from auth.mfa_factors where user_id = account.id;
      delete from auth.one_time_tokens where user_id = account.id;
      -- GoTrue's own audit trail stores the sign-in email in its payload.
      delete from auth.audit_log_entries where payload ->> 'actor_id' = account.id::text;
      summary := summary || jsonb_build_object('account_erased', true);
    else
      summary := summary || jsonb_build_object('account_erased', false);
    end if;
  end if;

  -- Last, the tombstone. The CHECK makes this exhaustive.
  update public.candidates
     set full_name = null, email = null, phone = null, city = null, state = null,
         linkedin_url = null, expected_salary = null, expected_salary_unit = null,
         work_authorized = null, desk = null, specialty = null, profile_id = null,
         deleted_at = now(), erased_at = now()
   where id = c;

  return summary;
end;
$$;

-- Moves one request on as far as the law allows today.
create function private.advance_deletion_request(target uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  req public.deletion_requests;
  floor_until timestamptz;
  floor_basis text[];
  summary jsonb;
begin
  select * into req from public.deletion_requests where id = target for update;
  if req.status not in ('scheduled', 'deferred') or req.execute_after > now() then
    return req.status;
  end if;

  perform set_config('talentrax.erasure_request', req.id::text, true);

  if private.has_active_hold(req.candidate_id) then
    update public.deletion_requests
       set status = 'deferred', deferred_until = null, deferral_basis = array['legal_hold']
     where id = req.id;
    perform set_config('talentrax.erasure_request', '', true);
    return 'deferred';
  end if;

  select f.retain_until, f.basis into floor_until, floor_basis
  from private.retention_floor(req.candidate_id) f;

  if floor_until is not null and floor_until > now() then
    if req.partially_executed_at is null then
      summary := private.erase_unretained(req);
      update public.deletion_requests
         set partially_executed_at = now(),
             erasure_summary = erasure_summary || jsonb_build_object('partial', summary)
       where id = req.id;
    end if;
    update public.deletion_requests
       set status = 'deferred', deferred_until = floor_until, deferral_basis = floor_basis
     where id = req.id;
    perform set_config('talentrax.erasure_request', '', true);
    return 'deferred';
  end if;

  summary := private.erase_candidate(req);
  update public.deletion_requests
     set status = 'executed', executed_at = now(),
         erasure_summary = erasure_summary || jsonb_build_object('final', summary),
         last_error_state = null
   where id = req.id;
  perform set_config('talentrax.erasure_request', '', true);
  return 'executed';
end;
$$;

-- =============================================================================
-- K. The public surface. Every function checks its caller itself.
-- =============================================================================

-- The signed-in candidate asks for their own data to be deleted. Returns the
-- open request if there already is one.
create function public.request_my_deletion()
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := private.current_candidate_id();
  result uuid;
begin
  if me is null or not private.has_role('job_seeker') then
    raise exception 'only a signed-in candidate can request their own deletion'
      using errcode = 'insufficient_privilege';
  end if;
  select id into result from public.deletion_requests
   where candidate_id = me and status in ('requested', 'scheduled', 'deferred');
  if result is null then
    insert into public.deletion_requests (candidate_id, manner, requested_by)
    values (me, 'self_service', private.current_profile_id())
    returning id into result;
  end if;
  return result;
end;
$$;

-- An administrator records a request received any other way.
create function public.record_deletion_request(p_candidate_id uuid, p_manner text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  result uuid;
begin
  if not private.is_admin() then
    raise exception 'only an administrator records a deletion request'
      using errcode = 'insufficient_privilege';
  end if;
  select id into result from public.deletion_requests
   where candidate_id = p_candidate_id and status in ('requested', 'scheduled', 'deferred');
  if result is null then
    insert into public.deletion_requests (candidate_id, manner, requested_by)
    values (p_candidate_id, p_manner, private.current_profile_id())
    returning id into result;
  end if;
  return result;
end;
$$;

-- Verified and decided. Works out whether anything must be kept, restricts
-- the candidate, and stops all contact. Nothing is erased here.
create function public.accept_deletion_request(
  p_request_id uuid,
  p_verification_method text,
  p_execute_after timestamptz default null
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  req public.deletion_requests;
  run_at timestamptz := coalesce(p_execute_after, now());
  floor_until timestamptz;
  floor_basis text[];
  held boolean;
  next_status text;
begin
  if not private.is_admin() then
    raise exception 'only an administrator accepts a deletion request'
      using errcode = 'insufficient_privilege';
  end if;
  select * into req from public.deletion_requests where id = p_request_id for update;
  if req.id is null or req.status <> 'requested' then
    raise exception 'only a requested deletion can be accepted' using errcode = 'check_violation';
  end if;

  held := private.has_active_hold(req.candidate_id);
  select f.retain_until, f.basis into floor_until, floor_basis
  from private.retention_floor(req.candidate_id) f;

  if held then
    next_status := 'deferred';
    floor_until := null;
    floor_basis := array['legal_hold'];
  elsif floor_until is not null and floor_until > run_at then
    next_status := 'deferred';
  else
    next_status := 'scheduled';
    floor_until := null;
    floor_basis := '{}';
  end if;

  update public.deletion_requests
     set status = next_status,
         verification_method = p_verification_method,
         accepted_at = now(),
         accepted_by = private.current_profile_id(),
         execute_after = run_at,
         deferred_until = floor_until,
         deferral_basis = floor_basis
   where id = req.id;

  -- Stop contact now, on both channels.
  perform public.record_opt_out('email', req.candidate_id, null, 'other', 'deletion request');
  perform public.record_opt_out('sms', req.candidate_id, null, 'other', 'deletion request');

  return next_status;
end;
$$;

create function public.refuse_deletion_request(p_request_id uuid, p_basis text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only an administrator refuses a deletion request'
      using errcode = 'insufficient_privilege';
  end if;
  update public.deletion_requests
     set status = 'refused', refused_at = now(), refused_by = private.current_profile_id(),
         refusal_basis = p_basis
   where id = p_request_id and status = 'requested';
  if not found then
    raise exception 'only a requested deletion can be refused' using errcode = 'check_violation';
  end if;
end;
$$;

-- The candidate, or an administrator, withdraws a request before anything
-- has been erased. Lifting the restriction is automatic: it follows status.
create function public.cancel_deletion_request(p_request_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  req public.deletion_requests;
begin
  select * into req from public.deletion_requests where id = p_request_id for update;
  if req.id is null
     or not (private.is_admin() or private.is_self_candidate(req.candidate_id)) then
    raise exception 'you may not cancel this request' using errcode = 'insufficient_privilege';
  end if;
  if req.status not in ('requested', 'scheduled', 'deferred') or req.partially_executed_at is not null then
    raise exception 'this request can no longer be cancelled: erasure has begun or it is closed'
      using errcode = 'check_violation';
  end if;
  update public.deletion_requests
     set status = 'cancelled', cancelled_at = now(), cancelled_by = private.current_profile_id()
   where id = req.id;
end;
$$;

create function public.place_legal_hold(p_candidate_id uuid, p_reason text, p_matter_reference text default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  result uuid;
begin
  if not private.is_admin() then
    raise exception 'only an administrator places a legal hold' using errcode = 'insufficient_privilege';
  end if;
  insert into public.legal_holds (candidate_id, reason, matter_reference, placed_by)
  values (p_candidate_id, p_reason, p_matter_reference, private.current_profile_id())
  returning id into result;
  return result;
end;
$$;

create function public.release_legal_hold(p_hold_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only an administrator releases a legal hold' using errcode = 'insufficient_privilege';
  end if;
  update public.legal_holds
     set released_at = now(), released_by = private.current_profile_id()
   where id = p_hold_id and released_at is null;
end;
$$;

-- THE ONLY WAY ANYTHING IS ERASED. service_role (the scheduled worker) and
-- the migration role (pg_cron, below) only. Each request is advanced in its
-- own subtransaction: one that fails rolls back completely - no half-erased
-- candidate - and records the SQLSTATE and an attempt, and the next run
-- retries it. Rows are taken with SKIP LOCKED, so two workers never process
-- the same request.
create function public.process_due_deletion_requests(p_limit integer default 25)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
  advanced integer := 0;
  failed_state text;
begin
  for r in
    select id from public.deletion_requests
    where status in ('scheduled', 'deferred')
      and execute_after <= now()
      and (status = 'scheduled'
           or partially_executed_at is null
           or deferred_until is null
           or deferred_until <= now())
    order by execute_after
    limit p_limit
    for update skip locked
  loop
    begin
      perform private.advance_deletion_request(r.id);
      advanced := advanced + 1;
    exception when others then
      get stacked diagnostics failed_state = returned_sqlstate;
      update public.deletion_requests
         set attempts = attempts + 1, last_error_state = failed_state, last_error_at = now()
       where id = r.id;
    end;
  end loop;
  return advanced;
end;
$$;

-- The storage worker's contract: take pending objects, then report each.
create function public.claim_storage_erasures(p_limit integer default 50)
returns table (id uuid, source_table text, object_path text)
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures s
     set attempts = s.attempts + 1, last_attempt_at = now()
   where s.id in (
     select x.id from public.storage_erasures x
     where x.status = 'pending'
     order by x.created_at
     limit p_limit
     for update skip locked
   )
  returning s.id, s.source_table, s.object_path
$$;

create function public.complete_storage_erasure(p_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures
     set status = 'done', completed_at = now(), object_path = null, last_error_state = null
   where id = p_id and status = 'pending'
$$;

create function public.fail_storage_erasure(p_id uuid, p_error_code text)
returns void
language sql security definer
set search_path = ''
as $$
  update public.storage_erasures
     set last_error_state = p_error_code
   where id = p_id and status = 'pending'
$$;

-- =============================================================================
-- L. Privileges and policies.
-- =============================================================================

-- Supabase grants EXECUTE on new public functions to every API role by
-- default. Take it all back, then grant exactly.
revoke execute on function
  public.request_my_deletion(),
  public.record_deletion_request(uuid, text),
  public.accept_deletion_request(uuid, text, timestamptz),
  public.refuse_deletion_request(uuid, text),
  public.cancel_deletion_request(uuid),
  public.place_legal_hold(uuid, text, text),
  public.release_legal_hold(uuid),
  public.process_due_deletion_requests(integer),
  public.claim_storage_erasures(integer),
  public.complete_storage_erasure(uuid),
  public.fail_storage_erasure(uuid, text)
from public, anon, authenticated, service_role;

grant execute on function
  public.request_my_deletion(),
  public.record_deletion_request(uuid, text),
  public.accept_deletion_request(uuid, text, timestamptz),
  public.refuse_deletion_request(uuid, text),
  public.cancel_deletion_request(uuid),
  public.place_legal_hold(uuid, text, text),
  public.release_legal_hold(uuid)
to authenticated;

grant execute on function
  public.process_due_deletion_requests(integer),
  public.claim_storage_erasures(integer),
  public.complete_storage_erasure(uuid),
  public.fail_storage_erasure(uuid, text)
to service_role;

revoke all on function
  private.erasure_candidate(), private.retention_floor(uuid),
  private.erase_unretained(public.deletion_requests), private.erase_candidate(public.deletion_requests),
  private.advance_deletion_request(uuid)
from public, anon, authenticated, service_role;
grant execute on function private.erasure_candidate() to authenticated, service_role;
grant execute on function
  private.is_restricted_candidate(uuid), private.has_active_hold(uuid),
  private.refuse_if_restricted(), private.guard_submission_event()
to authenticated, service_role;

-- Requests, holds and the outbox change only through the functions above.
revoke insert, update on public.deletion_requests, public.legal_holds, public.storage_erasures
  from authenticated, service_role;

alter table public.retention_rules enable row level security;
alter table public.legal_holds enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.storage_erasures enable row level security;

-- deletion_requests: the candidate sees their own (that is how they know it
-- was accepted, and until when it is deferred); administrators see all.
create policy deletion_requests_select on public.deletion_requests
  for select to authenticated
  using ((select private.is_admin()) or private.is_self_candidate(candidate_id));

-- legal_holds: administrators only.
create policy legal_holds_select on public.legal_holds
  for select to authenticated using ((select private.is_admin()));
create policy legal_holds_hide_deleted on public.legal_holds as restrictive
  for select to authenticated
  using (deleted_at is null or deleted_at = now() or (select private.is_admin()));
create policy legal_holds_freeze_deleted on public.legal_holds as restrictive
  for update to authenticated using (deleted_at is null or (select private.is_admin())) with check (true);

-- retention_rules: administrators read; only a super_admin changes a period.
create policy retention_rules_select on public.retention_rules
  for select to authenticated using ((select private.is_admin()));
create policy retention_rules_insert on public.retention_rules
  for insert to authenticated with check ((select private.has_role('super_admin')));
create policy retention_rules_update on public.retention_rules
  for update to authenticated
  using ((select private.has_role('super_admin')))
  with check ((select private.has_role('super_admin')));

-- storage_erasures: administrators read the queue.
create policy storage_erasures_select on public.storage_erasures
  for select to authenticated using ((select private.is_admin()));

-- =============================================================================
-- M. Run it. Every fifteen minutes the database advances whatever is due;
-- deferred requests execute themselves when their date passes. The storage
-- worker is separate: it needs the Storage API, which SQL cannot call.
-- =============================================================================

create extension if not exists pg_cron;
select cron.schedule(
  'process-deletion-requests',
  '*/15 * * * *',
  $$select public.process_due_deletion_requests(50)$$
);
