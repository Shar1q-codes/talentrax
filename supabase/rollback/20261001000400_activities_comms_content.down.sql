-- Rolls back 20261001000400_activities_comms_content.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.

drop table if exists
  public.content,
  public.message_log,
  public.email_templates,
  public.communication_consents,
  public.activities;

drop function if exists
  private.enforce_message_consent(),
  public.record_opt_out(text, uuid, uuid, text, text),
  public.can_send_message(text, uuid, uuid),
  private.guard_consent_update(),
  private.check_activity_subject();
