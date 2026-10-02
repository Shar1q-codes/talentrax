-- Rolls back 20261001001700_resume_upload_endpoints.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- The upload endpoints lose their two functions. Any outbox row queued for a
-- rejected upload is dropped with its reason: rerun the orphan sweep after
-- if the objects still need removing.

drop function public.record_resume_check(uuid, text);
drop function public.claim_resume_upload(uuid);
drop function private.resume_extension(text);

delete from public.storage_erasures where reason = 'rejected_upload';
alter table public.storage_erasures
  drop constraint storage_erasures_reason_check,
  add constraint storage_erasures_reason_check
    check (reason in ('erasure', 'orphan', 'post_restriction'));
