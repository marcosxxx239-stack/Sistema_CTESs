-- Create test users: CTES, Orientador, Supervisor, and 2 extra students
-- We insert into auth.users with crypt() for passwords, then profiles with correct roles

-- CTES user
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ctes@ufra.br',
  crypt('CtesUfra2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Maria Silva - CTES"}',
  now(),
  now()
)
RETURNING id, email;
