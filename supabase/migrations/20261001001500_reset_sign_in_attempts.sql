-- =============================================================================
-- 15. CLEARING AN ADDRESS'S SIGN-IN COUNT
--
-- The count for an address clears itself when that person passes the second
-- factor (migration 14). This clears it on purpose, for two callers only:
--
--   * the trusted backend (service_role), which is how the @db browser suite
--     leaves no account locked behind it;
--   * an operator in the SQL editor, after confirming who is asking
--     (supabase/STAFF-ACCESS.md, "Clearing a sign-in count").
--
-- Never anon or authenticated: an end user who could clear a count could
-- guess without limit.
-- =============================================================================

create function public.reset_sign_in_attempts(email text)
returns integer
language sql volatile security definer
set search_path = ''
as $$
  with cleared as (
    delete from private.sign_in_attempts a
    where a.email_key = private.sign_in_key(email)
    returning 1
  )
  select count(*)::integer from cleared
$$;
revoke all on function public.reset_sign_in_attempts(text) from public, anon, authenticated;
grant execute on function public.reset_sign_in_attempts(text) to service_role;
