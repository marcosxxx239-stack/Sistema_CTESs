import { useMemo } from "react";
import { Users, ClipboardList, Calendar, ArrowRight, Clock, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAdvisorAssignments, useSupervisorAssignments, useAllRequests, useDeadlines } from "@/lib/hooks";
import { Card, PageHeader, Button, EmptyState, Spinner, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, daysUntil, ROLE_META } from "@/lib/constants";
import type { PageKey } from "@/components/AppLayout";

export function AdvisorSupervisorDashboard({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const isAdvisor = profile?.role === "advisor";
  const { assignments: advisorAssignments } = useAdvisorAssignments(isAdvisor ? profile?.id : undefined);
  const { assignments: supervisorAssignments } = useSupervisorAssignments(!isAdvisor ? profile?.id : undefined);
  const { requests } = useAllRequests();
  const { deadlines } = useDeadlines();

  const assignments = isAdvisor ? advisorAssignments : supervisorAssignments;
  const roleMeta = ROLE_META[profile!.role];

  const myStudentIds = useMemo(() => new Set(assignments.map((a) => a.student_id)), [assignments]);
  const myActivityIds = useMemo(() => new Set(assignments.map((a) => a.activity_id)), [assignments]);

  const myRequests = useMemo(
    () => requests.filter((r) => myStudentIds.has(r.student_id) && myActivityIds.has(r.activity_id)),
    [requests, myStudentIds, myActivityIds]
  );

  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .filter((d) => !d.activity_id || myActivityIds.has(d.activity_id))
      .map((d) => ({ ...d, days: daysUntil(d.due_date) }))
      .filter((d) => d.days !== null && d.days >= 0 && d.days <= 30)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 5);
  }, [deadlines, myActivityIds]);

  const studentCount = myStudentIds.size;

  return (
    <div>
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] || roleMeta.short}`}
        subtitle={isAdvisor ? "Visão geral dos seus orientandos de TCC." : "Visão geral dos seus supervisionados de ESO."}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{studentCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{isAdvisor ? "Orientandos" : "Supervisionados"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{myRequests.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Solicitações</p>
            </div>
          </div>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <div className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{upcomingDeadlines.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prazos próximos</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My students' requests */}
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Solicitações recentes</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>
              Ver todas
            </Button>
          </div>
          <div className="p-2">
            {myRequests.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-10 h-10" />} title="Nenhuma solicitação" description="Aguardando solicitações dos seus alunos." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {myRequests.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onNavigate("request-detail", { id: r.id })}
                    className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {r.student?.full_name || r.student?.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.activity?.code} · {formatDate(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status} />
                      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Próximos prazos</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("deadlines")}>
              Ver todos
            </Button>
          </div>
          <div className="p-2">
            {upcomingDeadlines.length === 0 ? (
              <EmptyState icon={<Calendar className="w-10 h-10" />} title="Nenhum prazo próximo" />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {upcomingDeadlines.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(d.due_date)}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                      d.days! <= 7 ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400" : d.days! <= 15 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}>
                      {d.days === 0 ? "Hoje" : `${d.days}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{isAdvisor ? "Meus orientandos" : "Meus supervisionados"}</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate(isAdvisor ? "orientandos" : "supervisionados")}>
              Ver todos
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(myStudentIds).slice(0, 6).map((sid) => {
              const student = assignments.find((a) => a.student_id === sid)?.student;
              if (!student) return null;
              return (
                <div key={sid} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold shrink-0 ${
                    isAdvisor ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  }`}>
                    {(student.full_name || student.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{student.full_name || "Sem nome"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{student.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
