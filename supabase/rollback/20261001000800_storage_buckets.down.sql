-- Rolls back 20261001000800_storage_buckets.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- Fails on purpose if any of the three buckets still holds an object, or the
-- outbox holds a post_restriction row: those are files and queue entries
-- this rollback would otherwise strand.

do $$
begin
  if exists (select 1 from storage.objects
             where bucket_id in ('candidate-originals', 'candidate-scrubbed', 'resume-intake')) then
    raise exception 'the Talentrax buckets are not empty; refusing to roll back';
  end if;
  if exists (select 1 from public.storage_erasures where reason = 'post_restriction') then
    raise exception 'storage_erasures holds post_restriction rows; refusing to roll back';
  end if;
end;
$$;

select cron.unschedule('sweep-orphaned-storage');
drop function public.sweep_orphaned_storage_objects(interval);

alter table public.storage_erasures
  drop constraint storage_erasures_reason_check,
  add constraint storage_erasures_reason_check check (reason in ('erasure', 'orphan'));

drop policy talentrax_originals_read on storage.objects;
drop policy talentrax_scrubbed_read on storage.objects;
drop policy talentrax_intake_read on storage.objects;
drop policy talentrax_originals_upload on storage.objects;
drop policy talentrax_scrubbed_upload on storage.objects;

drop function
  private.storage_can_read_original(text),
  private.storage_can_read_scrubbed(text),
  private.storage_can_read_intake(text),
  private.storage_can_upload_original(text),
  private.storage_can_upload_scrubbed(text);

drop index public.resume_submissions_resume_storage_path_key;
alter table public.resume_submissions drop constraint resume_submissions_path_is_own;
grant insert (resume_storage_path) on public.resume_submissions to anon;

-- Session-scoped: psql runs each statement in its own transaction.
select set_config('storage.allow_delete_query', 'true', false);
delete from storage.buckets where id in ('candidate-originals', 'candidate-scrubbed', 'resume-intake');
select set_config('storage.allow_delete_query', 'false', false);
