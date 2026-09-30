-- Rolls back 20261001000500_row_level_security.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.

drop view if exists
  public.employer_submission_documents,
  public.employer_submissions,
  public.employer_requisitions,
  public.public_jobs;

do $$
declare
  p record;
  t record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', t.tablename);
  end loop;
end;
$$;

drop function if exists
  private.staff_can_read_person(uuid, uuid),
  private.can_read_subject(text, uuid),
  private.job_accepts_applications(uuid),
  private.can_read_submission(uuid),
  private.can_read_candidate(uuid),
  private.staff_can_read_candidate(uuid),
  private.can_manage_candidate(uuid),
  private.is_self_candidate(uuid),
  private.can_manage_requisition(uuid),
  private.can_read_requisition(uuid),
  private.can_write_employer(uuid),
  private.can_read_employer(uuid),
  private.is_on_requisition(uuid);

-- Restore Supabase's default grants.
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
