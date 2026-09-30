-- Rolls back 20261001000200_crm_core.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.

drop table if exists
  public.contact_messages,
  public.jobs,
  public.requisition_assignments,
  public.requisitions,
  public.leads,
  public.employer_contacts;

alter table if exists public.profiles drop column if exists employer_id;

drop table if exists public.employers;

drop function if exists
  private.job_is_public(text, boolean, timestamptz, timestamptz, timestamptz),
  private.guard_job_slug(),
  private.current_employer_id(),
  public.normalize_company_name(text),
  public.normalize_email(text);
