-- Rolls back 20261001000900_intake_rate_limits.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Rows held for review keep existing, but lose the held_at mark that said so.

select cron.unschedule('purge-intake-events');
drop function private.purge_intake_events();

drop trigger limit_intake on public.resume_submissions;
drop trigger limit_intake on public.contact_messages;
drop trigger limit_intake on public.leads;
drop function
  private.limit_intake(),
  private.reject_intake(integer),
  private.intake_retry_after(text, text, bytea, interval),
  private.intake_client_key(bytea);

revoke insert (submission_key) on public.resume_submissions, public.contact_messages, public.leads from anon;
drop index public.resume_submissions_submission_key_key;
drop index public.contact_messages_submission_key_key;
drop index public.leads_submission_key_key;
alter table public.resume_submissions drop column submission_key, drop column held_at;
alter table public.contact_messages drop column submission_key, drop column held_at;
alter table public.leads drop column submission_key, drop column held_at;

drop table private.intake_events;
drop table private.intake_settings;

delete from private.column_classification where table_name = 'intake_limits';
drop table public.intake_limits;
