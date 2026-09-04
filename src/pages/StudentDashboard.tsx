import { useMemo } from "react";
import {
  ClipboardList,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStudentRequests, useDeadlines, useDocuments } from "@/lib/hooks";
import { Card, PageHeader, Button, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META, formatDate, daysUntil, ROLE_META } from "@/lib/constants";
import type { PageKey } from "@/components/AppLayout";

export function StudentDashboard({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { requests, loading } = useStudentRequests(profile?.id);
  const { deadlines } = useDeadlines();
  const { documents } = useDocuments(undefined, profile?.id);

  const stats = useMemo(() => {
    const pending = requests.filter((r) =>
      ["enviado", "em_analise", "pendente"].includes(r.status)
    ).length;
    const corrections = requests.filter((r) => r.status === "aguardando_correcao").length;
    const approved = requests.filter((r) => ["aprovado", "finalizado"].includes(r.status)).length;
    return { total: requests.length, pending, corrections, approved };
  }, [requests]);

  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .map((d) => ({ ...d, days: daysUntil(d.due_date) }))
      .filter((d) => d.days !== null && d.days >= 0 && d.days <= 30)
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
        subtitle="Visão geral das suas atividades acadêmicas."
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Solicitações"
          value={stats.total}
          color="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Em andamento"
          value={stats.pending}
          color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Pendências"
          value={stats.corrections}
          color="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          highlight={stats.corrections > 0}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Aprovadas"
          value={stats.approved}
          color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent requests */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Solicitações recentes</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>
              Ver todas
            </Button>
          </div>
          <div className="p-2">
            {recentRequests.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-10 h-10" />}
                title="Nenhuma solicitação ainda"
                description="Inicie uma solicitação de matrícula em uma atividade."
                action={
                  <Button size="sm" onClick={() => onNavigate("activities")}>
                    Ver atividades
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentRequests.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onNavigate("request-detail", { id: r.id })}
                    className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.activity?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.activity?.code} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
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
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Nenhum prazo próximo"
                description="Não há prazos vencendo nos próximos 30 dias."
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {upcomingDeadlines.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(d.due_date)}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        d.days! <= 7
                          ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          : d.days! <= 15
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {d.days === 0 ? "Hoje" : `${d.days}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Pendências */}
      {stats.corrections > 0 && (
        <Card className="mt-6 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/30">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Você tem {stats.corrections} pendência(s)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Há solicitações aguardando correção. Acesse os detalhes para verificar a justificativa
                  e enviar a correção.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onNavigate("requests")}
                >
                  Ver pendências
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-orange-200 dark:border-orange-800" : ""}>
      <div className="p-4 flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
      </div>
    </Card>
  );
}
