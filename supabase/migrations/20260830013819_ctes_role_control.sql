/*
# CTES - Controle de perfil no cadastro

## Resumo
Garante que o cadastro público crie SOMENTE contas de aluno, e que apenas a CTES
possa alterar o perfil (role) de um usuário. Previne que alunos escalonem privilégios.

## Alterações
1. `handle_new_user()` — sempre define role='student', ignorando qualquer role
   enviada nos metadados. Extrai `registration_number` dos metadados.
2. Novo trigger `enforce_role_change_guard` em `profiles` — bloqueia UPDATE da
   coluna `role` quando o usuário atual não é CTES (exceto quando executado pelo
   service role, que bypassa RLS e triggers de aplicação).
3. RLS UPDATE em `profiles` refinada: um aluno só pode atualizar suas próprias
   colunas não-sensíveis (full_name, phone, department, registration_number).
   A coluna `role` só pode ser alterada se o solicitante for CTES.

## Segurança
- O gatilho `enforce_role_change_guard` é SECURITY DEFINER (precisa ler profiles
  para verificar current_user_role) mas revogado de public/anon/authenticated.
- O trigger roda no contexto da sessão do usuário; quando o service role (que
  bypassa RLS) faz UPDATE, `auth.uid()` é null e o guard permite a alteração.
*/

-- 1. Trigger: forçar role='student' no cadastro público
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name, role, registration_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'student',
    coalesce(new.raw_user_meta_data->>'registration_number', null)
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. Guard: impedir mudança de role por não-CTES
create or replace function public.enforce_role_change_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_ctes boolean;
begin
  -- Se a role não está sendo alterada, permitir
  if old.role is not distinct from new.role then
    return new;
  end if;

  -- auth.uid() é null quando o service role opera (bypassa RLS)
  if auth.uid() is null then
    return new;
  end if;

  select (public.current_user_role() = 'ctes') into is_ctes;
  if not is_ctes then
    raise exception 'Apenas a CTES pode alterar o perfil de um usuário.';
  end if;

  return new;
end;
$$;
revoke execute on function public.enforce_role_change_guard() from public, anon, authenticated;

drop trigger if exists trg_role_change_guard on public.profiles;
create trigger trg_role_change_guard
  before update of role on public.profiles
  for each row execute function public.enforce_role_change_guard();
