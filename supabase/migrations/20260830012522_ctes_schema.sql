/*
# CTES - Esquema principal do sistema

## Resumo
Cria o esquema completo do sistema de gerenciamento de atividades da CTES
(Comissão de Trabalho de Conclusão de Curso e Estágio Supervisionado Obrigatório)
do curso de Bacharelado em Sistemas de Informação da UFRA – Campus Paragominas.

## Novas tabelas
1. `profiles` — vincula auth.users a um perfil (aluno, ctes, orientador, supervisor) e dados pessoais.
2. `activities` — catálogo de atividades acadêmicas (ESO1, ESO2, TCC1, TCC2) com pré-requisito configurável.
3. `enrollment_requests` — solicitações de matrícula de alunos em atividades, com status e fluxo.
4. `form_definitions` — definições configuráveis de campos de formulário por atividade (JSONB).
5. `form_submissions` — respostas de formulários enviadas, vinculadas a uma solicitação.
6. `documents` — documentos/relatórios/manuscritos enviados, vinculados a solicitação e aluno.
7. `deadlines` — prazos administrados pela CTES (matrícula, entrega, defesa, outros).
8. `request_history` — histórico de auditoria de mudanças de status de solicitações.
9. `advisor_assignments` — vínculo orientador ↔ aluno (TCC).
10. `supervisor_assignments` — vínculo supervisor de estágio ↔ aluno (ESO).

## Segurança
- RLS habilitado em todas as tabelas.
- Políticas separadas por verbo CRUD, escopadas por papel (role) via funções auxiliares
  `current_user_role()` e `current_profile_id()` (SECURITY INVOKER, sem bypass de RLS).
- Trigger que cria perfil automaticamente ao cadastrar usuário (SECURITY DEFINER, execute revogado do público).
- Bucket de storage `documents` privado com políticas por proprietário/atribuição.

## Observações
- Os pré-requisitos (ESO2←ESO1, TCC2←TCC1) são configuráveis: a coluna
  `prerequisite_required_status` define qual status a atividade anterior precisa ter.
  O padrão é 'finalizado', mas a CTES pode alterar nas configurações.
- Os campos de formulário ficam em JSONB para serem alterados posteriormente sem migração.
- Nenhuma data é fixa no código: todos os prazos são armazenados na tabela `deadlines`.
*/

create extension if not exists pgcrypto;

-- ============================================================
-- PERFIS
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student','ctes','advisor','supervisor')),
  registration_number text,
  department text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============================================================
-- ATIVIDADES
-- ============================================================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null check (category in ('ESO','TCC')),
  sequence int not null default 1,
  prerequisite_activity_id uuid references public.activities(id),
  prerequisite_required_status text,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.activities enable row level security;

-- ============================================================
-- SOLICITAÇÕES DE MATRÍCULA
-- ============================================================
create table if not exists public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete restrict,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviado','em_analise','pendente','aguardando_correcao','aprovado','rejeitado','finalizado')),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  justification text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.enrollment_requests enable row level security;
create index if not exists idx_requests_student on public.enrollment_requests(student_id);
create index if not exists idx_requests_activity on public.enrollment_requests(activity_id);
create index if not exists idx_requests_status on public.enrollment_requests(status);

-- ============================================================
-- DEFINIÇÕES DE FORMULÁRIO (campos configuráveis)
-- ============================================================
create table if not exists public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  version int not null default 1,
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.form_definitions enable row level security;
create unique index if not exists uq_form_active_per_activity
  on public.form_definitions(activity_id) where is_active;

-- ============================================================
-- ENVIO DE FORMULÁRIOS
-- ============================================================
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.enrollment_requests(id) on delete cascade,
  form_definition_id uuid not null references public.form_definitions(id) on delete restrict,
  data jsonb not null default '{}'::jsonb,
  version int not null default 1,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.form_submissions enable row level security;
create index if not exists idx_formsub_request on public.form_submissions(request_id);

-- ============================================================
-- DOCUMENTOS
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.enrollment_requests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create index if not exists idx_documents_request on public.documents(request_id);
create index if not exists idx_documents_student on public.documents(student_id);

-- ============================================================
-- PRAZOS
-- ============================================================
create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities(id) on delete set null,
  deadline_type text not null check (deadline_type in ('matricula','entrega','defesa','outro')),
  title text not null,
  start_date date,
  end_date date,
  due_date date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.deadlines enable row level security;
create index if not exists idx_deadlines_activity on public.deadlines(activity_id);
create index if not exists idx_deadlines_due on public.deadlines(due_date);

-- ============================================================
-- HISTÓRICO DE SOLICITAÇÕES
-- ============================================================
create table if not exists public.request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.enrollment_requests(id) on delete cascade,
  user_id uuid references public.profiles(id),
  user_name text,
  action text not null,
  previous_status text,
  new_status text,
  observation text,
  created_at timestamptz not null default now()
);
alter table public.request_history enable row level security;
create index if not exists idx_history_request on public.request_history(request_id);

-- ============================================================
-- ATRIBUIÇÕES: ORIENTADOR (TCC) / SUPERVISOR (ESO)
-- ============================================================
create table if not exists public.advisor_assignments (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (advisor_id, student_id, activity_id)
);
alter table public.advisor_assignments enable row level security;

create table if not exists public.supervisor_assignments (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (supervisor_id, student_id, activity_id)
);
alter table public.supervisor_assignments enable row level security;

-- ============================================================
-- FUNÇÕES AUXILIARES (SECURITY INVOKER — respeitam RLS)
-- ============================================================
create or replace function public.current_user_role()
returns text language sql stable security invoker set search_path = public as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_profile_id()
returns uuid language sql stable security invoker set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- ============================================================
-- TRIGGER: criar perfil ao cadastrar usuário
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_requests_updated on public.enrollment_requests;
create trigger trg_requests_updated before update on public.enrollment_requests
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_deadlines_updated on public.deadlines;
create trigger trg_deadlines_updated before update on public.deadlines
  for each row execute function public.touch_updated_at();

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (auth.uid() = user_id or public.current_user_role() = 'ctes');
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert to authenticated
  with check (public.current_user_role() = 'ctes');
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (auth.uid() = user_id or public.current_user_role() = 'ctes')
  with check (auth.uid() = user_id or public.current_user_role() = 'ctes');
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles for delete to authenticated
  using (public.current_user_role() = 'ctes');

-- activities (catálogo: todos leem; só CTES edita)
drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities for select to authenticated
  using (true);
drop policy if exists "activities_write" on public.activities;
create policy "activities_write" on public.activities for all to authenticated
  using (public.current_user_role() = 'ctes')
  with check (public.current_user_role() = 'ctes');

-- form_definitions (todos leem; só CTES edita)
drop policy if exists "formdef_select" on public.form_definitions;
create policy "formdef_select" on public.form_definitions for select to authenticated
  using (true);
drop policy if exists "formdef_write" on public.form_definitions;
create policy "formdef_write" on public.form_definitions for all to authenticated
  using (public.current_user_role() = 'ctes')
  with check (public.current_user_role() = 'ctes');

-- form_submissions
drop policy if exists "formsub_select" on public.form_submissions;
create policy "formsub_select" on public.form_submissions for select to authenticated
  using (
    public.current_user_role() = 'ctes'
    or exists (select 1 from public.enrollment_requests r where r.id = form_submissions.request_id and r.student_id = public.current_profile_id())
    or exists (select 1 from public.advisor_assignments aa
        join public.enrollment_requests r on r.student_id = aa.student_id and r.activity_id = aa.activity_id
        where r.id = form_submissions.request_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.supervisor_assignments sa
        join public.enrollment_requests r on r.student_id = sa.student_id and r.activity_id = sa.activity_id
        where r.id = form_submissions.request_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "formsub_insert" on public.form_submissions;
create policy "formsub_insert" on public.form_submissions for insert to authenticated
  with check (
    exists (select 1 from public.enrollment_requests r where r.id = form_submissions.request_id and r.student_id = public.current_profile_id())
  );
drop policy if exists "formsub_update" on public.form_submissions;
create policy "formsub_update" on public.form_submissions for update to authenticated
  using (public.current_user_role() = 'ctes')
  with check (public.current_user_role() = 'ctes');
drop policy if exists "formsub_delete" on public.form_submissions;
create policy "formsub_delete" on public.form_submissions for delete to authenticated
  using (public.current_user_role() = 'ctes');

-- enrollment_requests
drop policy if exists "requests_select" on public.enrollment_requests;
create policy "requests_select" on public.enrollment_requests for select to authenticated
  using (
    public.current_user_role() = 'ctes'
    or student_id = public.current_profile_id()
    or exists (select 1 from public.advisor_assignments aa where aa.student_id = enrollment_requests.student_id and aa.activity_id = enrollment_requests.activity_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.supervisor_assignments sa where sa.student_id = enrollment_requests.student_id and sa.activity_id = enrollment_requests.activity_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "requests_insert" on public.enrollment_requests;
create policy "requests_insert" on public.enrollment_requests for insert to authenticated
  with check (student_id = public.current_profile_id());
drop policy if exists "requests_update" on public.enrollment_requests;
create policy "requests_update" on public.enrollment_requests for update to authenticated
  using (
    public.current_user_role() = 'ctes'
    or student_id = public.current_profile_id()
  )
  with check (
    public.current_user_role() = 'ctes'
    or student_id = public.current_profile_id()
  );
drop policy if exists "requests_delete" on public.enrollment_requests;
create policy "requests_delete" on public.enrollment_requests for delete to authenticated
  using (
    public.current_user_role() = 'ctes'
    or student_id = public.current_profile_id()
  );

-- documents
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents for select to authenticated
  using (
    public.current_user_role() = 'ctes'
    or student_id = public.current_profile_id()
    or exists (select 1 from public.advisor_assignments aa where aa.student_id = documents.student_id and aa.advisor_id = public.current_profile_id())
    or exists (select 1 from public.supervisor_assignments sa where sa.student_id = documents.student_id and sa.supervisor_id = public.current_profile_id())
  );
drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents for insert to authenticated
  with check (student_id = public.current_profile_id());
drop policy if exists "documents_update" on public.documents;
create policy "documents_update" on public.documents for update to authenticated
  using (student_id = public.current_profile_id() or public.current_user_role() = 'ctes')
  with check (student_id = public.current_profile_id() or public.current_user_role() = 'ctes');
drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents for delete to authenticated
  using (student_id = public.current_profile_id() or public.current_user_role() = 'ctes');

-- deadlines (todos leem; só CTES edita)
drop policy if exists "deadlines_select" on public.deadlines;
create policy "deadlines_select" on public.deadlines for select to authenticated
  using (true);
drop policy if exists "deadlines_write" on public.deadlines;
create policy "deadlines_write" on public.deadlines for all to authenticated
  using (public.current_user_role() = 'ctes')
  with check (public.current_user_role() = 'ctes');

-- request_history
drop policy if exists "history_select" on public.request_history;
create policy "history_select" on public.request_history for select to authenticated
  using (
    public.current_user_role() = 'ctes'
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
    public.current_user_role() = 'ctes'
    or exists (select 1 from public.enrollment_requests r where r.id = request_history.request_id and r.student_id = public.current_profile_id())
  );

-- advisor_assignments
drop policy if exists "advisor_select" on public.advisor_assignments;
create policy "advisor_select" on public.advisor_assignments for select to authenticated
  using (
    public.current_user_role() = 'ctes'
    or advisor_id = public.current_profile_id()
    or student_id = public.current_profile_id()
  );
drop policy if exists "advisor_write" on public.advisor_assignments;
create policy "advisor_write" on public.advisor_assignments for all to authenticated
  using (public.current_user_role() = 'ctes')
  with check (public.current_user_role() = 'ctes');

-- supervisor_assignments
drop policy if exists "supervisor_select" on public.supervisor_assignments;
create policy "supervisor_select" on public.supervisor_assignments for select to authenticated
  using (
    public.current_user_role() = 'ctes'
    or supervisor_id = public.current_profile_id()
    or student_id = public.current_profile_id()
  );
drop policy if exists "supervisor_write" on public.supervisor_assignments;
create policy "supervisor_write" on public.supervisor_assignments for all to authenticated
  using (public.current_user_role() = 'ctes')
  with check (public.current_user_role() = 'ctes');

-- ============================================================
-- STORAGE: bucket 'documents'
-- ============================================================
insert into storage.buckets (id, name, public) values ('documents','documents', false)
  on conflict (id) do nothing;

drop policy if exists "documents_storage_read" on storage.objects;
create policy "documents_storage_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents' and (
      public.current_user_role() = 'ctes'
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
drop policy if exists "documents_storage_insert" on storage.objects;
create policy "documents_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "documents_storage_update" on storage.objects;
create policy "documents_storage_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'ctes'
    )
  );
drop policy if exists "documents_storage_delete" on storage.objects;
create policy "documents_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'ctes'
    )
  );
