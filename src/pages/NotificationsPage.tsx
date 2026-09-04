import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/hooks";
import { Card, PageHeader, Button, EmptyState, Spinner, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/constants";
import type { AppNotification, NotificationType } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

const TYPE_META: Record<NotificationType, { icon: typeof Info; color: string; bg: string }> = {
  correction: { icon: AlertCircle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
  approved: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  rejeited: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
  pending: { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
  resubmitted: { icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
  info: { icon: Info, color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-700" },
};

export function NotificationsPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, removeNotification } = useNotifications(profile?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notificações"
        subtitle={unreadCount > 0 ? `${unreadCount} notificação${unreadCount > 1 ? "ões" : ""} não lida${unreadCount > 1 ? "s" : ""}` : "Todas as notificações foram lidas"}
        action={unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllAsRead}><CheckCheck className="w-4 h-4" /> Marcar todas como lidas</Button>}
      />

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="w-10 h-10" />}
            title="Nenhuma notificação"
            description="Você será notificado aqui quando houver atualizações nas suas solicitações."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type as NotificationType] ?? TYPE_META.info;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={!n.is_read ? "border-emerald-200 dark:border-emerald-800" : ""}>
                <div className="p-4 flex items-start gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                      {!n.is_read && <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Nova</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatDateTime(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {n.request_id && (
                      <Button variant="ghost" size="sm" onClick={() => onNavigate("request-detail", { id: n.request_id! })} title="Abrir solicitação">
                        Ver
                      </Button>
                    )}
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)} title="Marcar como lida">
                        <CheckCheck className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeNotification(n.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </Button>
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
