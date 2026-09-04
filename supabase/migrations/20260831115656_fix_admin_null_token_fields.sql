-- Fix: admin auth.users row has NULL in several text columns where Supabase auth
-- expects empty strings. The working student record has '' in all these fields.
-- This mismatch caused "Database error querying schema" on admin login.

UPDATE auth.users
SET
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = ''
WHERE email = 'admin.ctes@ufra.br';
