import { useMemo, useState, useEffect } from "react";
import { History as HistoryIcon, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStudentRequests, useAllRequests } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, EmptyState, Spinner } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/constants";
import type { RequestStatus, RequestHistoryEntry } from "@/lib/types";

export function HistoryPage() {
  const { profile } = useAuth();
  const isCTES = profile?.role === "ctes";
  const { requests, loading: reqLoading } = useAllRequests();
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const requestMap = useMemo(() => {
    const m = new Map<string, { code?: string; studentName?: string }>();
    requests.forEach((r) => {
      m.set(r.id, {
        code: r.activity?.code,
        studentName: r.student?.full_name || r.student?.email,
      });
    });
    return m;
  }, [requests]);

  const studentRequestIds = useMemo(() => {
    return new Set(requests.filter((r) => r.student_id === profile?.id).map((r) => r.id));
  }, [requests, profile?.id]);

  const loadHistory = async () => {
    setLoading(true);
    // For CTES: all history. For student: only their requests' history.
    let query = supabase.from("request_history").select("*").order("created_at", { ascending: false }).limit(200);
    const { data } = await query;
    let entries = (data as RequestHistoryEntry[]) ?? [];
    if (!isCTES) {
      entries = entries.filter((e) => studentRequestIds.has(e.request_id));
    }
    setHistory(entries);
    setLoading(false);
  };

  useEffect(() => {
    if (!reqLoading) loadHistory();
  }, [reqLoading]);

  const filtered = history.filter((h) => {
    if (!search) return true;
    const info = requestMap.get(h.request_id);
    const text = `${h.action} ${h.user_name ?? ""} ${info?.code ?? ""} ${info?.studentName ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

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
        title="Histórico"
        subtitle={isCTES ? "Registro de todas as ações do sistema." : "Evolução das suas solicitações."}
      />

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no histórico..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HistoryIcon className="w-10 h-10" />}
            title="Nenhum registro"
            description="O histórico será exibido conforme as ações forem realizadas."
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((h) => {
              const info = requestMap.get(h.request_id);
              return (
                <div key={h.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{h.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {h.user_name} · {formatDateTime(h.created_at)}
                        {info?.code && ` · ${info.code}`}
                        {isCTES && info?.studentName && ` · ${info.studentName}`}
                      </p>
                      {h.observation && (
                        <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-2 py-1.5">
                          {h.observation}
                        </p>
                      )}
                    </div>
                    {h.previous_status && h.new_status && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={h.previous_status as RequestStatus} />
                        <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
                        <StatusBadge status={h.new_status as RequestStatus} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
