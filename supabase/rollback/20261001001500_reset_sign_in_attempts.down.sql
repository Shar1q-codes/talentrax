-- Rolls back 20261001001500_reset_sign_in_attempts.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.
--
-- A sign-in count can then be cleared only by passing the second factor, or
-- by waiting out the window.

drop function public.reset_sign_in_attempts(text);
