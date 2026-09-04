-- Fix infinite RLS recursion: current_user_role() and current_profile_id()
-- query the profiles table, whose RLS policies call these same functions.
-- Mark them SECURITY DEFINER so they bypass RLS and break the recursion.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Grant execute to authenticated so RLS policies can call them
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
