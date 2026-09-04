-- Update CTES profile role from student to ctes
UPDATE profiles SET role = 'ctes', department = 'Coordenação de TCC e ESO' WHERE email = 'ctes@ufra.br';

-- Create Orientador (advisor) user
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'orientador@ufra.br',
  crypt('Orientador2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Prof. Carlos Oliveira"}',
  now(),
  now()
);

-- Create identity for orientador
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
FROM auth.users WHERE email = 'orientador@ufra.br';

-- Update orientador profile role (trigger creates it as student)
UPDATE profiles SET role = 'advisor', department = 'Departamento de Sistemas de Informação' WHERE email = 'orientador@ufra.br';

-- Create Supervisor user
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'supervisor@ufra.br',
  crypt('Supervisor2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Ana Souza - Supervisora"}',
  now(),
  now()
);

-- Create identity for supervisor
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
FROM auth.users WHERE email = 'supervisor@ufra.br';

-- Update supervisor profile role
UPDATE profiles SET role = 'supervisor', department = 'Supervisão de Estágio' WHERE email = 'supervisor@ufra.br';

-- Create test student 2
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'aluno2@ufra.br',
  crypt('Aluno2Ufra2026!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"João Pedro Santos","registration_number":"2022009852"}',
  now(),
  now()
);

-- Create identity for aluno2
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
FROM auth.users WHERE email = 'aluno2@ufra.br';
