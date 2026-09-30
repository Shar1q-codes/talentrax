-- Rolls back 20261001000100_foundation.sql.
-- LOCAL DEVELOPMENT ONLY. It destroys the audit log along with everything
-- else, which is exactly why it is not a migration and never runs against a
-- hosted project. See supabase/README.md.

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists
  public.specialties,
  public.desks,
  public.engagement_types,
  public.work_modes,
  public.us_states,
  public.job_statuses,
  public.lead_statuses,
  public.candidate_statuses,
  public.submission_statuses,
  public.audit_settings,
  public.profiles,
  public.audit_log;

-- The private schema's functions reference app_role, so they go first.
drop schema if exists private cascade;

drop type if exists public.app_role;

-- pgcrypto is left in place: Supabase installs it in every project.
drop extension if exists vector;
