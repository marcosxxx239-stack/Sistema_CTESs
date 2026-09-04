/*
# CTES — Login por matrícula

## Resumo
Permite que alunos façam login usando o número de matrícula em vez do e-mail.
Como o Supabase auth exige e-mail+senha, criamos uma função SECURITY DEFINER
que recebe a matrícula e devolve o e-mail correspondente, para que o frontend
possa então chamar signInWithPassword com o e-mail real.

## Alterações
1. Garante unicidade da matrícula entre alunos (partial unique index).
2. Função `get_email_by_registration(reg_code text)` — SECURITY DEFINER,
   revogada de public/anon/authenticated. Retorna o e-mail do perfil que tem
   a matrícula informada, ou NULL se não encontrar.
*/

-- 1. Unicidade de matrícula (apenas para alunos, ignorando NULLs)
create unique index if not exists uq_profiles_registration_student
  on public.profiles (registration_number)
  where role = 'student' and registration_number is not null;

-- 2. Função de lookup: matrícula -> e-mail
create or replace function public.get_email_by_registration(reg_code text)
returns text language sql security definer set search_path = public as $$
  select email from public.profiles
  where registration_number = reg_code
    and role = 'student'
  limit 1;
$$;
revoke execute on function public.get_email_by_registration(text) from public, anon, authenticated;
grant execute on function public.get_email_by_registration(text) to authenticated;
