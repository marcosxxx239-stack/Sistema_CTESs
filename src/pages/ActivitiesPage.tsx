import { useMemo } from "react";
import { BookOpen, ArrowRight, Lock, CheckCircle2, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useActivities, useStudentRequests } from "@/lib/hooks";
import { checkPrerequisite } from "@/lib/api";
import { Card, PageHeader, Button, EmptyState, Spinner, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { Activity } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

export function ActivitiesPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { activities, loading } = useActivities();
  const { requests, loading: reqLoading } = useStudentRequests(profile?.id);

  const activityStatus = useMemo(() => {
    const map: Record<string, { status: string | null; requestId: string | null }> = {};
    for (const r of requests) {
      const existing = map[r.activity_id];
      if (!existing || new Date(r.created_at) > new Date(r.created_at)) {
        map[r.activity_id] = { status: r.status, requestId: r.id };
      }
    }
    return map;
  }, [requests]);

  if (loading || reqLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Atividades Acadêmicas"
        subtitle="ESO e TCC — verifique pré-requisitos e inicie solicitações de matrícula."
      />

      <div className="grid md:grid-cols-2 gap-5">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            activities={activities}
            requests={requests}
            studentId={profile!.id}
            studentName={profile!.full_name || profile!.email}
            currentStatus={activityStatus[activity.id]?.status ?? null}
            existingRequestId={activityStatus[activity.id]?.requestId ?? null}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {activities.length === 0 && (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-10 h-10" />}
            title="Nenhuma atividade disponível"
            description="As atividades acadêmicas serão exibidas aqui quando cadastradas pela CTES."
          />
        </Card>
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  activities,
  requests,
  studentId,
  studentName,
  currentStatus,
  existingRequestId,
  onNavigate,
}: {
  activity: Activity;
  activities: Activity[];
  requests: any[];
  studentId: string;
  studentName: string;
  currentStatus: string | null;
  existingRequestId: string | null;
  onNavigate: (k: PageKey, ctx?: Record<string, string>) => void;
}) {
  const prereq = activity.prerequisite_activity_id
    ? activities.find((a) => a.id === activity.prerequisite_activity_id)
    : null;

  const prereqCheck = useMemo(() => {
    // synchronous version for display
    if (!activity.prerequisite_activity_id) return { ok: true, reason: null };
    const prereqAct = activities.find((a) => a.id === activity.prerequisite_activity_id);
    if (!prereqAct) return { ok: true, reason: null };
    const prereqReq = requests.find((r: any) => r.activity_id === prereqAct.id);
    if (!prereqReq) return { ok: false, reason: `Necessário ter solicitação de ${prereqAct.code}.` };
    if (activity.prerequisite_required_status && prereqReq.status !== activity.prerequisite_required_status) {
      return {
        ok: false,
        reason: `${prereqAct.code} precisa estar "${activity.prerequisite_required_status}". Atual: ${prereqReq.status}.`,
      };
    }
    return { ok: true, reason: null };
  }, [activity, activities, requests]);

  const hasRequest = currentStatus !== null;
  const isPrereqBlocked = !prereqCheck.ok;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-lg shrink-0 ${
                activity.category === "ESO"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              }`}
            >
              {activity.category === "ESO" ? (
                <FileText className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{activity.code}</h3>
                <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">{activity.category}</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{activity.name}</p>
            </div>
          </div>
          {hasRequest && currentStatus && (
            <StatusBadge status={currentStatus as any} />
          )}
        </div>

        {activity.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{activity.description}</p>
        )}

        {/* Pré-requisito info */}
        {prereq && (
          <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-3 py-2.5">
            <div className="flex items-start gap-2">
              {isPrereqBlocked ? (
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              )}
              <div className="text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  Pré-requisito: <span className="font-medium">{prereq.code}</span>
                  {activity.prerequisite_required_status && (
                    <> (status: <span className="font-medium">{activity.prerequisite_required_status}</span>)</>
                  )}
                </p>
                {isPrereqBlocked && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{prereqCheck.reason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action */}
        <div className="mt-4 flex items-center justify-end gap-2">
          {hasRequest && existingRequestId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("request-detail", { id: existingRequestId })}
            >
              Ver solicitação
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : isPrereqBlocked ? (
            <Button variant="outline" size="sm" disabled>
              <Lock className="w-4 h-4" />
              Bloqueado
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                onNavigate("new-request", { activityId: activity.id })
              }
            >
              Solicitar matrícula
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
