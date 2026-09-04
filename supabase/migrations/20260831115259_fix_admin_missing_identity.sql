-- Fix: admin user created directly in auth.users is missing the auth.identities row.
-- Supabase requires a matching identity row for signInWithPassword to work.
-- This caused "Database error querying schema" when logging in as admin.

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider_id,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true
  ),
  u.id::text,
  'email',
  u.last_sign_in_at,
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE u.email = 'admin.ctes@ufra.br'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
  );
