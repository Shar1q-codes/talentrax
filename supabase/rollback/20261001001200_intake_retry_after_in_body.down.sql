-- Rolls back 20261001001200_intake_retry_after_in_body.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- The 429 body loses its seconds; the Retry-After header is unaffected.

create or replace function private.reject_intake(retry_after integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- PostgREST turns SQLSTATE PGRST into the status and headers in DETAIL.
  -- The message is the same for every limit: it says nothing about why.
  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'rate_limited',
      'message', 'Too many submissions. Please wait and try again.',
      'details', null,
      'hint', null)::text,
    detail = json_build_object(
      'status', 429,
      'headers', json_build_object('Retry-After', retry_after::text))::text;
end;
$$;

revoke all on function private.reject_intake(integer) from public, anon, authenticated, service_role;
