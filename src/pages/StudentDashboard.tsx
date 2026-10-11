import { useMemo } from "react";
import { AlertCircle, ArrowRight, Calendar, Check, ClipboardList, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStudentRequests, useDeadlines } from "@/lib/hooks";
import { Card, PageHeader, Button, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META, formatDate, daysUntil } from "@/lib/constants";
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
    return requests.find((request) => !["finalizado", "rejeitado"].includes(request.status)) ?? requests[0] ?? null;
  }, [requests]);

  const correctionRequest = useMemo(
    () => requests.find((request) => request.status === "aguardando_correcao"),
    [requests]
  );

  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .map((deadline) => ({ ...deadline, days: daysUntil(deadline.due_date) }))
      .filter((deadline) => deadline.days !== null && deadline.days >= 0 && deadline.days <= 30)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 5);
  }, [deadlines]);

  const recentRequests = requests.slice(0, 5);

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

      {correctionRequest && (
        <Card className="mb-6 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <div className="flex items-start gap-3 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ação necessária</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Existe uma solicitação aguardando correção. Revise os detalhes para continuar.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate("request-detail", { id: correctionRequest.id })}>Revisar agora</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Solicitações recentes</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>Ver todas</Button>
          </div>
          <div className="p-2">
            {recentRequests.length === 0 ? (
              <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="Nenhuma solicitação ainda" description="Inicie uma solicitação de matrícula em uma atividade." action={<Button size="sm" onClick={() => onNavigate("activities")}>Ver atividades</Button>} />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentRequests.map((request) => (
                  <button key={request.id} onClick={() => onNavigate("request-detail", { id: request.id })} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{request.activity?.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{request.activity?.code} · {formatDate(request.created_at)}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Próximos prazos</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("deadlines")}>Ver todos</Button>
          </div>
          <div className="p-2">
            {upcomingDeadlines.length === 0 ? (
              <EmptyState icon={<Calendar className="h-10 w-10" />} title="Nenhum prazo próximo" description="Não há prazos vencendo nos próximos 30 dias." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{deadline.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatDate(deadline.due_date)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${deadline.days! <= 7 ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" : deadline.days! <= 15 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {deadline.days === 0 ? "Hoje" : `${deadline.days}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
