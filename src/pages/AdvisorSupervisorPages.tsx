import { useMemo } from "react";
import { Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAdvisorAssignments, useSupervisorAssignments, useAllRequests } from "@/lib/hooks";
import { Card, PageHeader, EmptyState, Spinner, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/constants";
import type { PageKey } from "@/components/AppLayout";
export function OrientandosPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { assignments, loading } = useAdvisorAssignments(profile?.id);
  const { requests } = useAllRequests();

  // Group by student
  const students = useMemo(() => {
    const map = new Map<string, { student: any; activities: any[] }>();
    for (const a of assignments) {
      if (!a.student) continue;
      const existing = map.get(a.student.id);
      if (existing) {
        existing.activities.push(a);
      } else {
        map.set(a.student.id, { student: a.student, activities: [a] });
      }
    }
    return Array.from(map.values());
  }, [assignments]);

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
        title="Orientandos"
        subtitle="Alunos vinculados a você como orientador de TCC."
      />

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="Nenhum orientando"
            description="Você ainda não tem alunos vinculados. A CTES atribui orientandos."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {students.map(({ student, activities }) => {
            const studentRequests = requests.filter((r) => r.student_id === student.id);
            return (
              <Card key={student.id}>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                        {(student.full_name || student.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{student.full_name || "Sem nome"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                        {student.registration_number && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Matrícula: {student.registration_number}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
                    {activities.map((a) => {
                      const req = studentRequests.find((r) => r.activity_id === a.activity_id);
                      return (
                        <div key={a.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                              {a.activity?.code}
                            </Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{a.activity?.name}</span>
                          </div>
                          {req ? (
                            <button
                              onClick={() => onNavigate("request-detail", { id: req.id })}
                              className="flex items-center gap-2"
                            >
                              <StatusBadge status={req.status} />
                              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Sem solicitação</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SupervisionadosPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { assignments, loading } = useSupervisorAssignments(profile?.id);
  const { requests } = useAllRequests();

  const students = useMemo(() => {
    const map = new Map<string, { student: any; activities: any[] }>();
    for (const a of assignments) {
      if (!a.student) continue;
      const existing = map.get(a.student.id);
      if (existing) existing.activities.push(a);
      else map.set(a.student.id, { student: a.student, activities: [a] });
    }
    return Array.from(map.values());
  }, [assignments]);

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
        title="Supervisionados"
        subtitle="Alunos vinculados a você como supervisor de estágio (ESO)."
      />

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="Nenhum supervisionado"
            description="Você ainda não tem alunos vinculados. A CTES atribui supervisionados."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {students.map(({ student, activities }) => {
            const studentRequests = requests.filter((r) => r.student_id === student.id);
            return (
              <Card key={student.id}>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold shrink-0">
                      {(student.full_name || student.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{student.full_name || "Sem nome"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                      {student.registration_number && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Matrícula: {student.registration_number}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
                    {activities.map((a) => {
                      const req = studentRequests.find((r) => r.activity_id === a.activity_id);
                      return (
                        <div key={a.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">{a.activity?.code}</Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{a.activity?.name}</span>
                          </div>
                          {req ? (
                            <button onClick={() => onNavigate("request-detail", { id: req.id })} className="flex items-center gap-2">
                              <StatusBadge status={req.status} />
                              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Sem solicitação</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

