-- =============================================================================
-- 12. THE 429 CARRIES ITS WAIT IN THE BODY, AS WELL AS THE HEADER
--
-- Migration 9 answers a refused submission with HTTP 429 and a Retry-After
-- header. The forms insert from the visitor's browser, cross-origin, and a
-- browser lets a page read only the response headers the server names in
-- Access-Control-Expose-Headers. The gateway's list does not include
-- Retry-After (checked against the local stack: Content-Encoding,
-- Content-Location, Content-Range, Content-Type, Date, Location, Server,
-- Transfer-Encoding, Range-Unit), and that list is not ours to configure on
-- hosted Supabase. So the form could see the 429 and never the wait.
--
-- The same number now rides in the error body's `details`, as a string of
-- whole seconds, the one place the page can read. The header stays: it is
-- the HTTP answer, and every client that can read it should.
--
-- Still nothing about WHICH limit refused it: the seconds are the same kind
-- of answer for all three, and the message is unchanged.
-- =============================================================================

create or replace function private.reject_intake(retry_after integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- PostgREST turns SQLSTATE PGRST into the status and headers in DETAIL.
  -- The message is the same for every limit: it says nothing about why.
  -- details repeats Retry-After for the browser, which cannot read the
  -- header cross-origin.
  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'rate_limited',
      'message', 'Too many submissions. Please wait and try again.',
      'details', retry_after::text,
      'hint', null)::text,
    detail = json_build_object(
      'status', 429,
      'headers', json_build_object('Retry-After', retry_after::text))::text;
end;
$$;

revoke all on function private.reject_intake(integer) from public, anon, authenticated, service_role;
