-- Fix: admin password was hashed with bcrypt cost 6, but Supabase auth requires cost 10+.
-- Regenerate the password hash with cost 10 so signInWithPassword works.

UPDATE auth.users
SET encrypted_password = crypt('AdminCtes2026!', gen_salt('bf', 10))
WHERE email = 'admin.ctes@ufra.br';
