/*
# Validate registration number before public signup

1. Purpose
- Adds a small read-only function used by the signup screen before creating an Auth user.
- Prevents the database trigger from failing with a generic "Database error saving new user" when a student registration number is already in use.

2. Database changes
- Adds `public.is_registration_available(reg_code text)`.
- The function returns true only when the supplied registration number is empty or is not already assigned to a student profile.

3. Security
- The function is SECURITY DEFINER and uses a fixed `public` search path.
- Direct execution is revoked from PUBLIC and granted only to anon and authenticated because it exposes availability, not profile data or email addresses.
- No tables, user data, or existing registrations are deleted or changed.
*/

CREATE OR REPLACE FUNCTION public.is_registration_available(reg_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(btrim(reg_code), '') IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE registration_number = btrim(reg_code)
        AND role = 'student'
    );
$$;

REVOKE ALL ON FUNCTION public.is_registration_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_registration_available(text) TO anon, authenticated;
