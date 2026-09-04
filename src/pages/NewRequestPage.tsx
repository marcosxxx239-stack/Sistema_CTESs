import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Lock, CheckCircle2, Info } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useActivities, useStudentRequests } from "@/lib/hooks";
import { checkPrerequisite, addHistoryEntry } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Spinner, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { Activity, EnrollmentRequest } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

export function NewRequestPage({
  activityId,
  onNavigate,
}: {
  activityId: string;
  onNavigate: (k: PageKey, ctx?: Record<string, string>) => void;
}) {
  const { profile } = useAuth();
  const { activities, loading: actLoading } = useActivities();
  const { requests, loading: reqLoading, reload } = useStudentRequests(profile?.id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prereqResult, setPrereqResult] = useState<{
    ok: boolean;
    reason: string | null;
    prerequisiteActivity?: Activity;
    prerequisiteRequest?: EnrollmentRequest;
  } | null>(null);

  const activity = activities.find((a) => a.id === activityId);

  useEffect(() => {
    if (!activity || !profile || reqLoading) return;
    checkPrerequisite(activity, profile.id, requests, activities).then(setPrereqResult);
  }, [activity, profile, requests, activities, reqLoading]);

  if (actLoading || reqLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  if (!activity) {
    return (
      <Card>
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Atividade não encontrada.</p>
          <Button variant="outline" className="mt-3" onClick={() => onNavigate("activities")}>
            Voltar
          </Button>
        </div>
      </Card>
    );
  }

  async function handleCreate() {
    if (!profile || !activity || !prereqResult?.ok) return;
    setCreating(true);
    setError(null);

    // Check if already has a request for this activity
    const existing = requests.find((r) => r.activity_id === activity!.id);
    if (existing) {
      onNavigate("request-detail", { id: existing.id });
      return;
    }

    const { data, error: insertError } = await supabase
      .from("enrollment_requests")
      .insert({
        student_id: profile!.id,
        activity_id: activity!.id,
        status: "rascunho",
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Erro ao criar solicitação.");
      setCreating(false);
      return;
    }

    await addHistoryEntry(
      data.id,
      profile!.full_name || profile!.email,
      "Solicitação de matrícula criada",
      null,
      "rascunho",
      undefined,
      profile!.id
    );

    await reload();
    onNavigate("request-detail", { id: data.id });
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => onNavigate("activities")}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para atividades
      </button>

      <PageHeader title="Solicitar Matrícula" />

      <Card className="mb-5">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-lg ${
                activity.category === "ESO" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {activity.category === "ESO" ? "ESO" : "TCC"}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{activity.code} — {activity.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pré-requisito check */}
      {prereqResult && (
        <Card className={`mb-5 ${prereqResult.ok ? "border-emerald-200 dark:border-emerald-800" : "border-orange-200 dark:border-orange-800"}`}>
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                  prereqResult.ok ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                }`}
              >
                {prereqResult.ok ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {prereqResult.ok ? "Pré-requisito atendido" : "Pré-requisito não atendido"}
                </h3>
                {prereqResult.prerequisiteActivity && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Esta atividade requer:{" "}
                    <span className="font-medium">{prereqResult.prerequisiteActivity.code}</span>
                    {activity.prerequisite_required_status && (
                      <>
                        {" "}com status{" "}
                        <span className="font-medium">"{activity.prerequisite_required_status}"</span>
                      </>
                    )}
                  </p>
                )}
                {prereqResult.prerequisiteRequest && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Status atual:</span>
                    <StatusBadge status={prereqResult.prerequisiteRequest.status} />
                  </div>
                )}
                {prereqResult.reason && (
                  <p className="text-sm text-orange-700 dark:text-orange-400 mt-2">{prereqResult.reason}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Flow steps preview */}
      <Card className="mb-5">
        <div className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Etapas do processo</h3>
          <ol className="space-y-2.5">
            {[
              "Solicitação de matrícula criada (rascunho)",
              "Preenchimento do formulário",
              "Envio para análise da CTES",
              "CTES analisa e define status",
              "Você acompanha o resultado",
              "Entrega de documento/relatório/manuscrito",
              "Finalização",
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => onNavigate("activities")}>
          Cancelar
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!prereqResult?.ok || creating}
        >
          {creating ? "Criando..." : "Criar solicitação"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
