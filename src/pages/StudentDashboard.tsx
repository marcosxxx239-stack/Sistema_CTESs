import { useMemo } from "react";
import { AlertCircle, ArrowRight, Calendar, Check, CheckCircle2, ClipboardList, FileText, FolderOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStudentRequests, useDeadlines } from "@/lib/hooks";
import { Card, PageHeader, Button, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, daysUntil } from "@/lib/constants";
import type { EnrollmentRequest, RequestStatus } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

const progressSteps = ["Matrícula", "Envio de Documentos", "Análise CTES", "Concluído"];

function getProgressIndex(status: RequestStatus): number {
  if (status === "rascunho") return 0;
  if (status === "enviado") return 1;
  if (["em_analise", "pendente", "aguardando_correcao"].includes(status)) return 2;
  return 3;
}

function getStatusMessage(request: EnrollmentRequest): string {
  const messages: Record<RequestStatus, string> = {
    rascunho: "Aguardando envio da matrícula",
    enviado: "Aguardando envio de documentos",
    em_analise: "Em análise pela CTES",
    pendente: "Aguardando documentação complementar",
    aguardando_correcao: "Aguardando correção do aluno",
    aprovado: "Processo aprovado pela CTES",
    rejeitado: "Processo não aprovado",
    finalizado: "Processo concluído",
  };
  return messages[request.status];
}

export function StudentDashboard({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { requests, loading } = useStudentRequests(profile?.id);
  const { deadlines } = useDeadlines();

  const activeRequest = useMemo(() => {
    return requests.find((r) => !["finalizado", "rejeitado"].includes(r.status)) ?? requests[0] ?? null;
  }, [requests]);

  const correctionRequest = useMemo(
    () => requests.find((r) => r.status === "aguardando_correcao"),
    [requests]
  );

  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .map((d) => ({ ...d, days: daysUntil(d.due_date) }))
      .filter((d) => d.days !== null && d.days >= 0 && d.days <= 30)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 5);
  }, [deadlines]);

  const hasPending = correctionRequest !== undefined || upcomingDeadlines.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] || "Aluno"}`}
        subtitle="Acompanhe seu processo acadêmico em um só lugar."
      />

      {/* Card principal de status */}
      <Card className="mb-6 overflow-hidden border-emerald-200 dark:border-emerald-900/60">
        {activeRequest ? (
          <>
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Processo acadêmico ativo</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{activeRequest.activity?.name ?? "Atividade acadêmica"}</h2>
                  <p className="mt-2 text-base font-medium text-gray-700 dark:text-gray-300">{getStatusMessage(activeRequest)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:pt-1">
                <StatusBadge status={activeRequest.status} />
                <Button variant="outline" size="sm" onClick={() => onNavigate("request-detail", { id: activeRequest.id })}>
                  Ver detalhes <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="border-t border-emerald-100 bg-emerald-50/50 px-5 py-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:px-6">
              <div className="flex items-start">
                {progressSteps.map((step, index) => {
                  const currentStep = getProgressIndex(activeRequest.status);
                  const completed = index < currentStep;
                  const current = index === currentStep;
                  return (
                    <div key={step} className={`relative flex flex-1 flex-col items-center text-center ${index < progressSteps.length - 1 ? "after:absolute after:left-1/2 after:top-3 after:h-0.5 after:w-full" : ""} ${completed || current ? "after:bg-emerald-500" : "after:bg-gray-200 dark:after:bg-gray-700"}`}>
                      <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${completed ? "border-emerald-600 bg-emerald-600 text-white" : current ? "border-emerald-600 bg-white text-emerald-600 dark:bg-gray-800" : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-800"}`}>
                        {completed ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                      </div>
                      <span className={`mt-2 max-w-[90px] text-[11px] font-medium leading-tight sm:max-w-none sm:text-xs ${current || completed ? "text-emerald-700 dark:text-emerald-300" : "text-gray-400 dark:text-gray-500"}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Seu processo acadêmico</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">Nenhum processo iniciado</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Escolha uma atividade para começar sua jornada.</p>
            </div>
            <Button onClick={() => onNavigate("activities")}>Ver atividades</Button>
          </div>
        )}
      </Card>

      {/* Bloco de avisos e prazos */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Avisos e prazos</h2>
        </div>
        <div className="p-5">
          {hasPending ? (
            <div className="space-y-3">
              {correctionRequest && (
                <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-800 dark:bg-orange-950/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Solicitação aguardando correção</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{correctionRequest.activity?.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate("request-detail", { id: correctionRequest.id })}>Revisar</Button>
                </div>
              )}
              {upcomingDeadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{d.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Prazo limite: {formatDate(d.due_date)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${d.days! <= 7 ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" : d.days! <= 15 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                    {d.days === 0 ? "Hoje" : `${d.days}d`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sua situação acadêmica está em dia.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Painel de ações rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickAction
          icon={<ClipboardList className="h-7 w-7" />}
          label="Nova Solicitação de Matrícula"
          description="Inicie uma nova matrícula em atividade acadêmica."
          onClick={() => onNavigate("activities")}
        />
        <QuickAction
          icon={<FileText className="h-7 w-7" />}
          label="Submeter Manuscrito / Relatório"
          description="Envie seu documento em PDF para análise."
          onClick={() => onNavigate("documents")}
        />
        <QuickAction
          icon={<FolderOpen className="h-7 w-7" />}
          label="Modelos Oficiais da CTES"
          description="Acesse e baixe os modelos e formulários oficiais."
          onClick={() => onNavigate("library")}
        />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-emerald-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-700"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        Acessar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
