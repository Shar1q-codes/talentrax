-- =============================================================================
-- 17. THE RESUME UPLOAD: ISSUING A SLOT, AND RECORDING THE CHECK
--
-- The upload is the one in STORAGE.md: the visitor's browser inserts the
-- intake row (anon, rate limited, migration 9), then asks our server for a
-- signed upload URL, uploads straight to Storage, and asks our server to
-- check what arrived. The server acts with the secret key (service_role).
-- These two functions are everything it may do to the row, so its writes
-- are one audited place, not ad hoc updates from TypeScript:
--
--   claim_resume_upload(key)   the row for this submission key, if it is
--                              fresh, live, undecided and declares an
--                              allowed file. Assigns its path once, under
--                              the row's id, and stamps the upload issued.
--   record_resume_check(key,   the verdict on the object at that path:
--     reason)                  received (reason null), or rejected with
--                              size_mismatch, type_mismatch or
--                              signature_mismatch. A rejected file is queued
--                              for deletion in the same transaction, with
--                              the new outbox reason 'rejected_upload'.
--
-- Both are service_role only: no visitor, and no staff member, can mark a
-- file received or rejected (migration 11 already refuses it to every end
-- user, staff included).
--
-- The submission key is the only handle the browser has on its row: anon
-- cannot read the row, not even its id. A key is unguessable (a v4 UUID the
-- form makes), and a slot is offered only within fifteen minutes of the
-- row's insert, so a key found later is worth nothing.
-- =============================================================================

alter table public.storage_erasures
  drop constraint storage_erasures_reason_check,
  add constraint storage_erasures_reason_check
    check (reason in ('erasure', 'orphan', 'post_restriction', 'rejected_upload'));

-- The intake bucket's own limits are the one source of the allowed types and
-- the size cap (migration 8 set them from the form's own).
create function private.resume_extension(mime text)
returns text
language sql immutable
set search_path = ''
as $$
  select case mime
    when 'application/pdf' then '.pdf'
    when 'application/msword' then '.doc'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then '.docx'
  end
$$;
revoke all on function private.resume_extension(text) from public, anon, authenticated;

-- state:
--   upload    a path is assigned and nothing is there yet: mint a URL for it
--   uploaded  an object is already at the path: go straight to the check
--   received  already checked and kept: nothing to do (a retry)
--   rejected  already checked and refused: nothing to do (a retry)
-- No row: no such key, too old, deleted, or a declared file the bucket
-- would not accept. The caller cannot tell which.
create function public.claim_resume_upload(p_submission_key uuid)
returns table (state text, storage_path text, mime_type text, size_bytes bigint)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  rs public.resume_submissions;
  bucket storage.buckets;
  path text;
begin
  select * into rs from public.resume_submissions r
  where r.submission_key = p_submission_key and r.deleted_at is null
  for update;
  if rs.id is null then
    return;
  end if;

  if rs.resume_received_at is not null then
    return query select 'received'::text, rs.resume_storage_path, rs.resume_mime_type, rs.resume_size_bytes;
    return;
  end if;
  if rs.resume_rejected_at is not null then
    return query select 'rejected'::text, rs.resume_storage_path, rs.resume_mime_type, rs.resume_size_bytes;
    return;
  end if;

  if rs.created_at < now() - interval '15 minutes' then
    return;
  end if;
  select * into bucket from storage.buckets b where b.id = 'resume-intake';
  if rs.resume_mime_type is null or not (rs.resume_mime_type = any (bucket.allowed_mime_types))
     or private.resume_extension(rs.resume_mime_type) is null
     or rs.resume_size_bytes is null or rs.resume_size_bytes > bucket.file_size_limit then
    return;
  end if;

  path := coalesce(rs.resume_storage_path,
    rs.id::text || '/' || gen_random_uuid()::text || private.resume_extension(rs.resume_mime_type));
  update public.resume_submissions
     set resume_storage_path = path,
         resume_upload_issued_at = coalesce(resume_upload_issued_at, now())
   where id = rs.id;

  return query select
    case when exists (select 1 from storage.objects o where o.bucket_id = 'resume-intake' and o.name = path)
      then 'uploaded' else 'upload' end,
    path, rs.resume_mime_type, rs.resume_size_bytes;
end;
$$;
revoke all on function public.claim_resume_upload(uuid) from public, anon, authenticated;
grant execute on function public.claim_resume_upload(uuid) to service_role;

-- The verdict. Returns 'received' or 'rejected', or NULL when there is
-- nothing to decide (no such key, no path yet, or already decided - in
-- which case the caller asks claim_resume_upload what was decided).
create function public.record_resume_check(p_submission_key uuid, p_rejected_reason text)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  rs public.resume_submissions;
begin
  if p_rejected_reason is not null
     and p_rejected_reason not in ('size_mismatch', 'type_mismatch', 'signature_mismatch') then
    raise exception 'not a check result: %', p_rejected_reason using errcode = 'check_violation';
  end if;

  select * into rs from public.resume_submissions r
  where r.submission_key = p_submission_key and r.deleted_at is null
    and r.resume_storage_path is not null
    and r.resume_received_at is null and r.resume_rejected_at is null
  for update;
  if rs.id is null then
    return null;
  end if;

  if p_rejected_reason is null then
    update public.resume_submissions set resume_received_at = now() where id = rs.id;
    return 'received';
  end if;

  update public.resume_submissions
     set resume_rejected_at = now(), resume_rejected_reason = p_rejected_reason
   where id = rs.id;
  insert into public.storage_erasures (reason, bucket, object_path)
  values ('rejected_upload', 'resume-intake', rs.resume_storage_path)
  on conflict (bucket, object_path) where status = 'pending' do nothing;
  return 'rejected';
end;
$$;
revoke all on function public.record_resume_check(uuid, text) from public, anon, authenticated;
grant execute on function public.record_resume_check(uuid, text) to service_role;
