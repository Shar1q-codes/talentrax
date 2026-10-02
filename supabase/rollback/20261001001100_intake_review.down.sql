-- Rolls back 20261001001100_intake_review.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Rows lose their test flag and the record of whether their resume arrived.

select cron.unschedule('expire-unreceived-resumes');
drop function private.expire_unreceived_resumes();

drop trigger guard_resume_verification on public.resume_submissions;
drop function private.guard_resume_verification();

delete from private.column_classification
 where table_name = 'resume_submissions' and column_name = 'resume_rejected_reason';
alter table public.resume_submissions
  drop constraint resume_submissions_upload_needs_path,
  drop constraint resume_submissions_received_or_rejected,
  drop constraint resume_submissions_rejection_has_reason,
  drop column resume_upload_issued_at,
  drop column resume_received_at,
  drop column resume_rejected_at,
  drop column resume_rejected_reason;

drop index public.resume_submissions_inbox_idx;
drop index public.contact_messages_inbox_idx;
drop index public.leads_inbox_idx;

drop trigger flag_test_intake on public.resume_submissions;
drop trigger flag_test_intake on public.contact_messages;
drop trigger flag_test_intake on public.leads;
drop function private.flag_test_intake();
drop function private.is_reserved_test_address(text);

alter table public.resume_submissions drop column is_test;
alter table public.contact_messages drop column is_test;
alter table public.leads drop column is_test;
