import { useState, useMemo } from "react";
import { ClipboardList, Search, Filter, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStudentRequests, useAllRequests } from "@/lib/hooks";
import { Card, PageHeader, Button, EmptyState, Spinner, Input, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META, formatDate, ROLE_META } from "@/lib/constants";
import type { RequestStatus } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

export function RequestsPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { requests, loading } = useStudentRequests(profile?.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        !search ||
        r.activity?.name.toLowerCase().includes(search.toLowerCase()) ||
        r.activity?.code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

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
        title="Minhas Solicitações"
        subtitle="Acompanhe o status das suas solicitações de matrícula."
        action={
          <Button onClick={() => onNavigate("activities")}>
            Nova solicitação
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por atividade..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="w-10 h-10" />}
            title="Nenhuma solicitação encontrada"
            description={requests.length === 0 ? "Inicie uma solicitação de matrícula." : "Ajuste os filtros."}
            action={
              requests.length === 0 ? (
                <Button onClick={() => onNavigate("activities")}>Ver atividades</Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => onNavigate("request-detail", { id: r.id })}
                className="flex items-center justify-between w-full px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                      r.activity?.category === "ESO" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <span className="text-xs font-bold">{r.activity?.code?.slice(0, 3)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.activity?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {r.activity?.code} · Criada em {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={r.status} />
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function CtesRequestsPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { requests, loading } = useAllRequests();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        !search ||
        r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.student?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.activity?.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesActivity = activityFilter === "all" || r.activity_id === activityFilter;
      return matchesSearch && matchesStatus && matchesActivity;
    });
  }, [requests, search, statusFilter, activityFilter]);

  const activities = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.activity) map.set(r.activity.id, r.activity.code);
    });
    return Array.from(map.entries());
  }, [requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  const pendingCount = requests.filter((r) =>
    ["enviado", "em_analise", "pendente"].includes(r.status)
  ).length;
  const correctionCount = requests.filter((r) => r.status === "aguardando_correcao").length;

  return (
    <div>
      <PageHeader
        title="Solicitações"
        subtitle="Analise e gerencie todas as solicitações de matrícula."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{requests.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Em andamento</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{correctionCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aguardando correção</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por aluno ou atividade..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Todas as atividades</option>
          {activities.map(([id, code]) => (
            <option key={id} value={id}>
              {code}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="w-10 h-10" />}
            title="Nenhuma solicitação encontrada"
            description="Ajuste os filtros ou aguarde novas solicitações."
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => onNavigate("request-detail", { id: r.id })}
                className="flex items-center justify-between w-full px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                      r.activity?.category === "ESO" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <span className="text-xs font-bold">{r.activity?.code?.slice(0, 3)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {r.student?.full_name || r.student?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {r.activity?.code} · {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={r.status} />
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
