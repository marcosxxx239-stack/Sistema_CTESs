/*
# CTES - Dados iniciais (catálogo)

## Resumo
Popula o catálogo de atividades acadêmicas (ESO1, ESO2, TCC1, TCC2) com seus
pré-requisitos configuráveis, definições de formulário (campos genéricos a serem
refinados posteriormente pela CTES) e prazos de exemplo para o semestre corrente.

## Alterações
1. Insere 4 atividades com pré-requisitos encadeados (ESO2←ESO1, TCC2←TCC1).
   - `prerequisite_required_status` = 'finalizado' por padrão (configurável pela CTES).
2. Insere 4 definições de formulário ativas (uma por atividade) com campos genéricos.
3. Insere prazos de exemplo (matrícula e entrega) vinculados às atividades.

## Segurança
- Sem alterações de RLS. Dados visíveis a todos os perfis autenticados.
*/

-- Atividades (inseridas em ordem para que as FKs de pré-requisito resolvam)
insert into public.activities (code, name, category, sequence, description, sort_order, prerequisite_activity_id, prerequisite_required_status)
values
  ('ESO1', 'Estágio Supervisionado Obrigatório 1', 'ESO', 1, 'Primeira etapa do estágio supervisionado obrigatório.', 1, null, null),
  ('TCC1', 'Trabalho de Conclusão de Curso 1', 'TCC', 1, 'Primeira etapa do TCC.', 2, null, null),
  ('ESO2', 'Estágio Supervisionado Obrigatório 2', 'ESO', 2, 'Segunda etapa do estágio supervisionado obrigatório. Possui ESO1 como pré-requisito.', 3,
    (select id from public.activities where code='ESO1'), 'finalizado'),
  ('TCC2', 'Trabalho de Conclusão de Curso 2', 'TCC', 2, 'Segunda etapa do TCC. Possui TCC1 como pré-requisito.', 4,
    (select id from public.activities where code='TCC1'), 'finalizado')
on conflict (code) do nothing;

-- Definições de formulário (campos genéricos — estrutura para a CTES refinar)
insert into public.form_definitions (activity_id, version, fields, is_active)
select a.id, 1,
  case a.code
    when 'ESO1' then '[
      {"key":"nome","label":"Nome completo","type":"text","required":true,"help":""},
      {"key":"matricula","label":"Matrícula","type":"text","required":true,"help":""},
      {"key":"empresa","label":"Empresa/Instituição do estágio","type":"text","required":true,"help":""},
      {"key":"supervisor_local","label":"Supervisor local do estágio","type":"text","required":true,"help":""},
      {"key":"carga_horaria","label":"Carga horária prevista (h)","type":"number","required":true,"help":""},
      {"key":"periodo","label":"Período do estágio","type":"text","required":true,"help":"Ex.: 2026.1"},
      {"key":"objetivos","label":"Objetivos do estágio","type":"textarea","required":true,"help":""}
    ]'::jsonb
    when 'ESO2' then '[
      {"key":"nome","label":"Nome completo","type":"text","required":true,"help":""},
      {"key":"matricula","label":"Matrícula","type":"text","required":true,"help":""},
      {"key":"empresa","label":"Empresa/Instituição do estágio","type":"text","required":true,"help":""},
      {"key":"supervisor_local","label":"Supervisor local do estágio","type":"text","required":true,"help":""},
      {"key":"carga_horaria","label":"Carga horária prevista (h)","type":"number","required":true,"help":""},
      {"key":"periodo","label":"Período do estágio","type":"text","required":true,"help":"Ex.: 2026.2"},
      {"key":"atividades","label":"Atividades a serem desenvolvidas","type":"textarea","required":true,"help":""}
    ]'::jsonb
    when 'TCC1' then '[
      {"key":"nome","label":"Nome completo","type":"text","required":true,"help":""},
      {"key":"matricula","label":"Matrícula","type":"text","required":true,"help":""},
      {"key":"titulo_preliminar","label":"Título preliminar do TCC","type":"text","required":true,"help":""},
      {"key":"orientador","label":"Orientador proposto","type":"text","required":true,"help":""},
      {"key":"area","label":"Área/Linha de pesquisa","type":"text","required":false,"help":""},
      {"key":"resumo","label":"Resumo/Proposta","type":"textarea","required":true,"help":""}
    ]'::jsonb
    when 'TCC2' then '[
      {"key":"nome","label":"Nome completo","type":"text","required":true,"help":""},
      {"key":"matricula","label":"Matrícula","type":"text","required":true,"help":""},
      {"key":"titulo_definitivo","label":"Título definitivo do TCC","type":"text","required":true,"help":""},
      {"key":"orientador","label":"Orientador","type":"text","required":true,"help":""},
      {"key":"banca_sugerida","label":"Banca sugerida","type":"textarea","required":false,"help":""},
      {"key":"resumo_final","label":"Resumo do trabalho","type":"textarea","required":true,"help":""}
    ]'::jsonb
  end,
  true
from public.activities a
where not exists (
  select 1 from public.form_definitions fd where fd.activity_id = a.id and fd.is_active
);

-- Prazos de exemplo (sem datas fixas no código — valores ajustáveis pela CTES)
insert into public.deadlines (activity_id, deadline_type, title, start_date, end_date, due_date, is_active)
select a.id, 'matricula', 'Período de matrícula — ' || a.code, '2026-03-01', '2026-03-20', '2026-03-20', true
from public.activities a
where not exists (select 1 from public.deadlines d where d.activity_id = a.id and d.deadline_type='matricula');

insert into public.deadlines (activity_id, deadline_type, title, start_date, end_date, due_date, is_active)
select a.id, 'entrega', 'Entrega de documento — ' || a.code, null, null, '2026-06-30', true
from public.activities a
where not exists (select 1 from public.deadlines d where d.activity_id = a.id and d.deadline_type='entrega');
