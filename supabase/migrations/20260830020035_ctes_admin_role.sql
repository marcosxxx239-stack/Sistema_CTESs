/*
# CTES — Administrador Geral

## Resumo
Adiciona o perfil 'admin' (Administrador Geral) ao sistema. O admin tem acesso
exclusivo à administração: criar/editar/desativar usuários, definir perfis,
gerenciar configurações e permissões. O admin não é criado via cadastro público.

## Alterações
1. Adiciona 'admin' ao CHECK constraint da coluna `profiles.role`.
2. Atualiza `handle_new_user()` — continua forçando role='student' no cadastro público.
3. Atualiza `enforce_role_change_guard()` — permite que admin OU ctes alterem roles.
4. Atualiza todas as políticas RLS para que o admin tenha os mesmos (ou maiores) privilégios da CTES.
5. Adiciona coluna `is_active` a `profiles` para permitir desativar usuários.
6. Cria o Administrador Geral inicial (via service role no DO block).
*/

-- 1. Adicionar 'admin' ao CHECK constraint de role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','ctes','advisor','supervisor','admin'));

-- 2. Adicionar coluna is_active a profiles
alter table public.profiles add column if not exists is_active boolean not null default true;

-- 3. Atualizar handle_new_user: sempre 'student', extrai registration_number
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

-- 4. Atualizar role guard: admin OU ctes podem alterar role
create or replace function public.enforce_role_change_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
begin
  if old.role is not distinct from new.role then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  select public.current_user_role() into caller_role;
  if caller_role not in ('admin', 'ctes') then
    raise exception 'Apenas o Administrador Geral ou a CTES pode alterar o perfil de um usuário.';
  end if;

  return new;
end;
$$;
revoke execute on function public.enforce_role_change_guard() from public, anon, authenticated;

-- 5. Atualizar RLS policies — admin tem todos os privilégios da CTES

-- profiles: admin vê/edita todos; self vê/edita próprio (não-role)
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (auth.uid() = user_id or public.current_user_role() in ('ctes','admin'));
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert to authenticated
  with check (public.current_user_role() in ('ctes','admin'));
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (auth.uid() = user_id or public.current_user_role() in ('ctes','admin'))
  with check (auth.uid() = user_id or public.current_user_role() in ('ctes','admin'));
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles for delete to authenticated
  using (public.current_user_role() in ('ctes','admin'));

-- activities: admin edita
drop policy if exists "activities_write" on public.activities;
create policy "activities_write" on public.activities for all to authenticated
  using (public.current_user_role() in ('ctes','admin'))
  with check (public.current_user_role() in ('ctes','admin'));

-- form_definitions: admin edita
drop policy if exists "formdef_write" on public.form_definitions;
create policy "formdef_write" on public.form_definitions for all to authenticated
  using (public.current_user_role() in ('ctes','admin'))
  with check (public.current_user_role() in ('ctes','admin'));

-- form_submissions: admin vê/edita
drop policy if exists "formsub_select" on public.form_submissions;
create policy "formsub_select" on public.form_submissions for select to authenticated
  using (
    public.current_user_role() in ('ctes','admin')
    or exists (select 1 from public.enrollment_requests r where r.id = form_submissions.request_id and r.student_id = public.current_profile_id())
    or exists (select 1 from public.advisor_assignments aa
        join public.enrollment_requests r on r.student_id = aa.student_id and r.activity_id = aa.activity_id
        where r.id = form_submissions.request_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.supervisor_assignments sa
        join public.enrollment_requests r on r.student_id = sa.student_id and r.activity_id = sa.activity_id
        where r.id = form_submissions.request_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "formsub_update" on public.form_submissions;
create policy "formsub_update" on public.form_submissions for update to authenticated
  using (public.current_user_role() in ('ctes','admin'))
  with check (public.current_user_role() in ('ctes','admin'));
drop policy if exists "formsub_delete" on public.form_submissions;
create policy "formsub_delete" on public.form_submissions for delete to authenticated
  using (public.current_user_role() in ('ctes','admin'));

-- enrollment_requests: admin vê/edita tudo
drop policy if exists "requests_select" on public.enrollment_requests;
create policy "requests_select" on public.enrollment_requests for select to authenticated
  using (
    public.current_user_role() in ('ctes','admin')
    or student_id = public.current_profile_id()
    or exists (select 1 from public.advisor_assignments aa where aa.student_id = enrollment_requests.student_id and aa.activity_id = enrollment_requests.activity_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.supervisor_assignments sa where sa.student_id = enrollment_requests.student_id and sa.activity_id = enrollment_requests.activity_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "requests_update" on public.enrollment_requests;
create policy "requests_update" on public.enrollment_requests for update to authenticated
  using (public.current_user_role() in ('ctes','admin') or student_id = public.current_profile_id())
  with check (public.current_user_role() in ('ctes','admin') or student_id = public.current_profile_id());
drop policy if exists "requests_delete" on public.enrollment_requests;
create policy "requests_delete" on public.enrollment_requests for delete to authenticated
  using (public.current_user_role() in ('ctes','admin') or student_id = public.current_profile_id());

-- documents: admin vê/edita
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents for select to authenticated
  using (
    public.current_user_role() in ('ctes','admin')
    or student_id = public.current_profile_id()
    or exists (select 1 from public.advisor_assignments aa where aa.student_id = documents.student_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.supervisor_assignments sa where sa.student_id = documents.student_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "documents_update" on public.documents;
create policy "documents_update" on public.documents for update to authenticated
  using (student_id = public.current_profile_id() or public.current_user_role() in ('ctes','admin'))
  with check (student_id = public.current_profile_id() or public.current_user_role() in ('ctes','admin'));
drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents for delete to authenticated
  using (student_id = public.current_profile_id() or public.current_user_role() in ('ctes','admin'));

-- deadlines: admin edita
drop policy if exists "deadlines_write" on public.deadlines;
create policy "deadlines_write" on public.deadlines for all to authenticated
  using (public.current_user_role() in ('ctes','admin'))
  with check (public.current_user_role() in ('ctes','admin'));

-- request_history: admin vê/insere
drop policy if exists "history_select" on public.request_history;
create policy "history_select" on public.request_history for select to authenticated
  using (
    public.current_user_role() in ('ctes','admin')
    or exists (select 1 from public.enrollment_requests r where r.id = request_history.request_id and r.student_id = public.current_profile_id())
    or exists (select 1 from public.enrollment_requests r
        join public.advisor_assignments aa on aa.student_id = r.student_id and aa.activity_id = r.activity_id
        where r.id = request_history.request_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.enrollment_requests r
        join public.supervisor_assignments sa on sa.student_id = r.student_id and sa.activity_id = r.activity_id
        where r.id = request_history.request_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "history_insert" on public.request_history;
create policy "history_insert" on public.request_history for insert to authenticated
  with check (
    public.current_user_role() in ('ctes','admin')
    or exists (select 1 from public.enrollment_requests r where r.id = request_history.request_id and r.student_id = public.current_profile_id())
  );

-- advisor_assignments: admin edita
drop policy if exists "advisor_write" on public.advisor_assignments;
create policy "advisor_write" on public.advisor_assignments for all to authenticated
  using (public.current_user_role() in ('ctes','admin'))
  with check (public.current_user_role() in ('ctes','admin'));

-- supervisor_assignments: admin edita
drop policy if exists "supervisor_write" on public.supervisor_assignments;
create policy "supervisor_write" on public.supervisor_assignments for all to authenticated
  using (public.current_user_role() in ('ctes','admin'))
  with check (public.current_user_role() in ('ctes','admin'));

-- storage policies: admin tem acesso
drop policy if exists "documents_storage_read" on storage.objects;
create policy "documents_storage_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents' and (
      public.current_user_role() in ('ctes','admin')
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.advisor_assignments aa
        join public.profiles sp on sp.id = aa.student_id
        where aa.advisor_id = public.current_profile_id()
          and sp.user_id::text = (storage.foldername(name))[1]
      )
      or exists (
        select 1 from public.supervisor_assignments sa
        join public.profiles sp on sp.id = sa.student_id
        where sa.supervisor_id = public.current_profile_id()
          and sp.user_id::text = (storage.foldername(name))[1]
      )
    )
  );
drop policy if exists "documents_storage_update" on storage.objects;
create policy "documents_storage_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() in ('ctes','admin')
    )
  );
drop policy if exists "documents_storage_delete" on storage.objects;
create policy "documents_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() in ('ctes','admin')
    )
  );

-- 6. Criar Administrador Geral inicial
-- E-mail: admin.ctes@ufra.br  |  Senha: AdminCtes2026!
-- O usuário é criado via auth.users usando o service role (DO block).
do $$
declare
  admin_uid uuid;
begin
  -- Verifica se já existe um admin
  select user_id into admin_uid from public.profiles where role = 'admin' limit 1;
  if admin_uid is not null then
    raise notice 'Administrador Geral já existe, pulando criação.';
    return;
  end if;

  -- Cria o usuário no auth.users diretamente (service role bypassa RLS)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin.ctes@ufra.br',
    crypt('AdminCtes2026!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Administrador Geral"}'::jsonb
  ) returning id into admin_uid;

  -- Cria o perfil como admin (o trigger criaria como student, então atualizamos)
  insert into public.profiles (user_id, email, full_name, role)
  values (admin_uid, 'admin.ctes@ufra.br', 'Administrador Geral', 'admin')
  on conflict (user_id) do update set role = 'admin';

  raise notice 'Administrador Geral criado: admin.ctes@ufra.br / AdminCtes2026!';
end;
$$;
