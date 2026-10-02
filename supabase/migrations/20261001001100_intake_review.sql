-- =============================================================================
-- 11. WHAT STAFF NEED TO REVIEW WHAT THE FORMS SEND
--
-- Two things, before any form is wired:
--
-- A. TEST VERSUS REAL. Only jobs had an is_test flag. The three intake
--    tables now have one too, and it defaults FALSE - the opposite of jobs,
--    on purpose. Hiding a real candidate's submission as a test row costs
--    more than showing staff a test row they can mark. Seed data never
--    reaches a hosted project (supabase/LOCAL.md), so a production inbox
--    starts empty; what this catches is a test made against production:
--      - an address on a reserved test domain (RFC 2606 / RFC 6761) is
--        flagged automatically, so a smoke test never needs cleaning up;
--      - staff mark anything else.
--    An end user can never set it: on insert it is computed from the
--    address and nothing else.
--
-- B. WHETHER A RESUME ACTUALLY ARRIVED. The upload is two steps (the row,
--    then a signed upload straight to Storage), so a row can exist with no
--    file, or with a file that is not what was declared. Four columns say
--    which, and only the trusted backend writes them:
--      resume_upload_issued_at  a signed upload URL was minted for the path
--      resume_received_at       the object was checked and is what was
--                               declared: size, type and its first bytes
--      resume_rejected_at/      it never arrived, or failed the check
--        resume_rejected_reason
--    The byte check needs the file, so it runs in the upload endpoint, not
--    here. Hourly, this migration's job marks the rows whose upload URL
--    expired with nothing uploaded as not_received.
--
-- Erasure needs no change: these are columns of resume_submissions, which
-- an erasure deletes whole (supabase/ERASURE.md).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. is_test.
-- -----------------------------------------------------------------------------
alter table public.resume_submissions add column is_test boolean not null default false;
alter table public.contact_messages add column is_test boolean not null default false;
alter table public.leads add column is_test boolean not null default false;

-- An address on a domain reserved for testing: example.com, .net, .org, and
-- the .test, .example, .invalid and .localhost top-level domains.
create function private.is_reserved_test_address(address text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(
    lower(split_part(btrim(address), '@', 2)) in ('example.com', 'example.net', 'example.org')
    or lower(split_part(btrim(address), '@', 2)) ~ '(^|\.)(test|example|invalid|localhost)$',
    false)
$$;

-- On insert by an end user, is_test is the address's verdict and nothing the
-- request said. The trusted backend and staff may set it as they like.
create function private.flag_test_intake()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if private.is_end_user_request() then
    -- Through jsonb: leads has contact_email where the others have email.
    new.is_test := private.is_reserved_test_address(
      to_jsonb(new) ->> case tg_table_name when 'leads' then 'contact_email' else 'email' end);
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['resume_submissions', 'contact_messages', 'leads'] loop
    execute format(
      'create trigger flag_test_intake before insert on public.%I
         for each row execute function private.flag_test_intake()', t);
  end loop;
end;
$$;

-- The inbox lists real, live rows newest first.
create index resume_submissions_inbox_idx on public.resume_submissions (created_at desc)
  where not is_test and deleted_at is null;
create index contact_messages_inbox_idx on public.contact_messages (created_at desc)
  where not is_test and deleted_at is null;
create index leads_inbox_idx on public.leads (created_at desc)
  where not is_test and deleted_at is null;

-- -----------------------------------------------------------------------------
-- B. Whether the resume arrived.
-- -----------------------------------------------------------------------------
alter table public.resume_submissions
  add column resume_upload_issued_at timestamptz,
  add column resume_received_at timestamptz,
  add column resume_rejected_at timestamptz,
  add column resume_rejected_reason text check (resume_rejected_reason in (
    'not_received', 'size_mismatch', 'type_mismatch', 'signature_mismatch'
  )),
  add constraint resume_submissions_upload_needs_path check (
    (resume_upload_issued_at is null and resume_received_at is null and resume_rejected_at is null)
    or resume_storage_path is not null
  ),
  add constraint resume_submissions_received_or_rejected check (
    resume_received_at is null or resume_rejected_at is null
  ),
  add constraint resume_submissions_rejection_has_reason check (
    (resume_rejected_at is null) = (resume_rejected_reason is null)
  );

insert into private.column_classification (table_name, column_name, personal)
values ('resume_submissions', 'resume_rejected_reason', false);

-- Only the trusted backend says whether a file arrived. Staff hold
-- table-level UPDATE through RLS, and a column REVOKE cannot narrow a table
-- grant, so this is a trigger: an end user (staff included) can neither set
-- these columns on insert nor change them afterwards.
create function private.guard_resume_verification()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_end_user_request() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.resume_upload_issued_at is not null or new.resume_received_at is not null
       or new.resume_rejected_at is not null or new.resume_rejected_reason is not null then
      raise exception 'whether a resume arrived is recorded by the upload endpoint only'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.resume_storage_path is distinct from old.resume_storage_path
     or new.resume_upload_issued_at is distinct from old.resume_upload_issued_at
     or new.resume_received_at is distinct from old.resume_received_at
     or new.resume_rejected_at is distinct from old.resume_rejected_at
     or new.resume_rejected_reason is distinct from old.resume_rejected_reason then
    raise exception 'whether a resume arrived is recorded by the upload endpoint only'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_resume_verification before insert or update on public.resume_submissions
  for each row execute function private.guard_resume_verification();

-- A signed upload URL lives two hours (Supabase Storage). Past that, plus a
-- margin, a row whose path holds no object never will: not_received. A row
-- whose object did arrive but was never checked (the browser left before
-- the endpoint's check) is left alone; the check runs when staff open it.
create function private.expire_unreceived_resumes()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.resume_submissions rs
     set resume_rejected_at = now(), resume_rejected_reason = 'not_received'
   where rs.resume_upload_issued_at < now() - interval '2 hours 15 minutes'
     and rs.resume_received_at is null
     and rs.resume_rejected_at is null
     and not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'resume-intake' and o.name = rs.resume_storage_path);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.expire_unreceived_resumes() from public, anon, authenticated, service_role;
-- The two triggers fire for anon's inserts, so, as with migration 9's
-- limiter, they run as their owner and every role that inserts may execute
-- them.
revoke all on function private.flag_test_intake(), private.guard_resume_verification() from public;
grant execute on function private.flag_test_intake(), private.guard_resume_verification()
  to anon, authenticated, service_role;

select cron.schedule('expire-unreceived-resumes', '29 * * * *',
  $$select private.expire_unreceived_resumes()$$);
