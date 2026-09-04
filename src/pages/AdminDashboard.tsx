import { useEffect, useState } from "react";
import { Users, ClipboardList, Calendar, Settings, TrendingUp, UserCheck, UserX, Shield } from "lucide-react";
import { Card, PageHeader, Spinner, Badge } from "@/components/ui";
import { useProfiles, useAllRequests, useActivities } from "@/lib/hooks";
import { ROLE_META } from "@/lib/constants";
import type { PageKey } from "@/components/AppLayout";
import type { Role } from "@/lib/types";

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${accent}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function AdminDashboard({ onNavigate }: { onNavigate: (key: PageKey, ctx?: Record<string, string>) => void }) {
  const { profiles, loading: profilesLoading } = useProfiles();
  const { requests, loading: requestsLoading } = useAllRequests();
  const { activities } = useActivities();

  const loading = profilesLoading || requestsLoading;

  const usersByRole = useState<Record<string, number>>({})[0];
  const counts: Record<Role, number> = {
    admin: 0,
    student: 0,
    ctes: 0,
    advisor: 0,
    supervisor: 0,
  };
  profiles.forEach((p) => {
    if (counts[p.role] !== undefined) counts[p.role]++;
  });

  const activeUsers = profiles.filter((p) => p.is_active).length;
  const inactiveUsers = profiles.filter((p) => !p.is_active).length;
  const pendingRequests = requests.filter((r) => r.status === "enviado" || r.status === "em_analise").length;

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
        title="Painel do Administrador"
        subtitle="Visão geral do sistema e gerenciamento de usuários."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total de usuários" value={profiles.length} icon={<Users className="w-6 h-6 text-white" />} accent="bg-emerald-600" />
        <StatCard label="Usuários ativos" value={activeUsers} icon={<UserCheck className="w-6 h-6 text-white" />} accent="bg-blue-600" />
        <StatCard label="Usuários inativos" value={inactiveUsers} icon={<UserX className="w-6 h-6 text-white" />} accent="bg-gray-500" />
        <StatCard label="Solicitações pendentes" value={pendingRequests} icon={<ClipboardList className="w-6 h-6 text-white" />} accent="bg-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Distribuição por perfil</h3>
            <button
              onClick={() => onNavigate("users")}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Ver todos →
            </button>
          </div>
          <div className="space-y-3">
            {(Object.keys(ROLE_META) as Role[]).map((role) => {
              const total = profiles.length || 1;
              const pct = Math.round((counts[role] / total) * 100);
              return (
                <div key={role} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <Badge className={roleBadgeClass(role)}>{ROLE_META[role].short}</Badge>
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{counts[role]}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Ações rápidas</h3>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate("users")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Gerenciar usuários
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Configurações do sistema
            </button>
            <button
              onClick={() => onNavigate("ctes-requests")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Solicitações
            </button>
            <button
              onClick={() => onNavigate("deadlines")}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Prazos
            </button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Atividades recentes do sistema</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <Shield className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{activities.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Atividades cadastradas</p>
          </div>
          <div className="text-center">
            <ClipboardList className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{requests.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Solicitações totais</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.student}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Alunos</p>
          </div>
          <div className="text-center">
            <Users className="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts.ctes + counts.advisor + counts.supervisor + counts.admin}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Servidores</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case "admin": return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    case "student": return "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "ctes": return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "advisor": return "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800";
    case "supervisor": return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  }
}
