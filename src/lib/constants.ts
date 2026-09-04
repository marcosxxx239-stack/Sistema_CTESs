import type { RequestStatus, Role } from "./types";

export const STATUS_META: Record<
  RequestStatus,
  { label: string; color: string; dot: string }
> = {
  rascunho: { label: "Rascunho", color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600", dot: "bg-gray-400 dark:bg-gray-400" },
  enviado: { label: "Enviado", color: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
  em_analise: { label: "Em análise", color: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  pendente: { label: "Pendente", color: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  aguardando_correcao: { label: "Aguardando correção", color: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
  aprovado: { label: "Aprovado", color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  rejeitado: { label: "Rejeitado", color: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800", dot: "bg-red-500" },
  finalizado: { label: "Finalizado", color: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800", dot: "bg-teal-600" },
};

export const ROLE_META: Record<Role, { label: string; short: string }> = {
  admin: { label: "Administrador Geral", short: "Admin" },
  student: { label: "Aluno", short: "Aluno" },
  ctes: { label: "CTES / Coordenação", short: "CTES" },
  advisor: { label: "Orientador / Professor", short: "Orientador" },
  supervisor: { label: "Supervisor de Estágio", short: "Supervisor" },
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "student", label: "Aluno" },
  { value: "ctes", label: "CTES / Coordenação" },
  { value: "advisor", label: "Orientador / Professor" },
  { value: "supervisor", label: "Supervisor de Estágio" },
  { value: "admin", label: "Administrador Geral" },
];

export const STATUS_ORDER: RequestStatus[] = [
  "rascunho",
  "enviado",
  "em_analise",
  "pendente",
  "aguardando_correcao",
  "aprovado",
  "rejeitado",
  "finalizado",
];

export const DEADLINE_TYPE_META: Record<
  string,
  { label: string; color: string }
> = {
  matricula: { label: "Matrícula", color: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  entrega: { label: "Entrega", color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  defesa: { label: "Defesa", color: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  outro: { label: "Outro", color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
};

export const DOCUMENT_TYPES: Record<string, string> = {
  relatorio_eso1: "Relatório de ESO 1",
  relatorio_eso2: "Relatório de ESO 2",
  manuscrito_tcc1: "Manuscrito de TCC 1",
  manuscrito_tcc2: "Manuscrito de TCC 2",
};

export const FIELD_TYPE_META: Record<string, { label: string; hasOptions: boolean }> = {
  text: { label: "Texto", hasOptions: false },
  textarea: { label: "Texto longo", hasOptions: false },
  number: { label: "Número", hasOptions: false },
  date: { label: "Data", hasOptions: false },
  email: { label: "E-mail", hasOptions: false },
  select: { label: "Seleção", hasOptions: true },
  radio: { label: "Múltipla escolha", hasOptions: true },
  checkbox: { label: "Sim/Não", hasOptions: false },
  file: { label: "Upload de arquivo", hasOptions: false },
};

export const FIELD_TYPES = Object.keys(FIELD_TYPE_META);

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
