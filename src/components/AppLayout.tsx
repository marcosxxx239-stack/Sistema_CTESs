import { useState, type ReactNode, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Calendar,
  History,
  User,
  Users,
  Settings,
  GraduationCap,
  LogOut,
  Menu,
  X,
  BookOpen,
  FolderOpen,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useNotifications } from "@/lib/hooks";
import { ROLE_META, formatDateTime } from "@/lib/constants";
import { cn } from "./ui";
import type { Role } from "@/lib/types";

export type PageKey =
  | "dashboard"
  | "activities"
  | "requests"
  | "request-detail"
  | "new-request"
  | "form"
  | "documents"
  | "library"
  | "deadlines"
  | "history"
  | "notifications"
  | "profile"
  | "orientandos"
  | "supervisionados"
  | "users"
  | "settings"
  | "ctes-requests";

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
}

function navForRole(role: Role): NavItem[] {
  const common: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  ];

  switch (role) {
    case "student":
      return [
        ...common,
        { key: "activities", label: "Atividades", icon: <BookOpen className="w-5 h-5" /> },
        { key: "requests", label: "Solicitações", icon: <ClipboardList className="w-5 h-5" /> },
        { key: "documents", label: "Documentos", icon: <FolderOpen className="w-5 h-5" /> },
        { key: "deadlines", label: "Prazos", icon: <Calendar className="w-5 h-5" /> },
        { key: "notifications", label: "Notificações", icon: <Bell className="w-5 h-5" /> },
        { key: "history", label: "Histórico", icon: <History className="w-5 h-5" /> },
        { key: "profile", label: "Perfil", icon: <User className="w-5 h-5" /> },
      ];
    case "ctes":
      return [
        ...common,
        { key: "ctes-requests", label: "Solicitações", icon: <ClipboardList className="w-5 h-5" /> },
        { key: "activities", label: "Atividades", icon: <BookOpen className="w-5 h-5" /> },
        { key: "deadlines", label: "Prazos", icon: <Calendar className="w-5 h-5" /> },
        { key: "documents", label: "Documentos", icon: <FolderOpen className="w-5 h-5" /> },
        { key: "library", label: "Biblioteca", icon: <FileText className="w-5 h-5" /> },
        { key: "users", label: "Usuários", icon: <Users className="w-5 h-5" /> },
        { key: "history", label: "Histórico", icon: <History className="w-5 h-5" /> },
        { key: "settings", label: "Configurações", icon: <Settings className="w-5 h-5" /> },
        { key: "profile", label: "Perfil", icon: <User className="w-5 h-5" /> },
      ];
    case "admin":
      return [
        ...common,
        { key: "users", label: "Usuários", icon: <Users className="w-5 h-5" /> },
        { key: "ctes-requests", label: "Solicitações", icon: <ClipboardList className="w-5 h-5" /> },
        { key: "activities", label: "Atividades", icon: <BookOpen className="w-5 h-5" /> },
        { key: "deadlines", label: "Prazos", icon: <Calendar className="w-5 h-5" /> },
        { key: "documents", label: "Documentos", icon: <FolderOpen className="w-5 h-5" /> },
        { key: "library", label: "Biblioteca", icon: <FileText className="w-5 h-5" /> },
        { key: "history", label: "Histórico", icon: <History className="w-5 h-5" /> },
        { key: "settings", label: "Configurações", icon: <Settings className="w-5 h-5" /> },
        { key: "profile", label: "Perfil", icon: <User className="w-5 h-5" /> },
      ];
    case "advisor":
      return [
        ...common,
        { key: "orientandos", label: "Orientandos", icon: <Users className="w-5 h-5" /> },
        { key: "requests", label: "Solicitações TCC", icon: <ClipboardList className="w-5 h-5" /> },
        { key: "documents", label: "Documentos", icon: <FolderOpen className="w-5 h-5" /> },
        { key: "deadlines", label: "Prazos", icon: <Calendar className="w-5 h-5" /> },
        { key: "profile", label: "Perfil", icon: <User className="w-5 h-5" /> },
      ];
    case "supervisor":
      return [
        ...common,
        { key: "supervisionados", label: "Supervisionados", icon: <Users className="w-5 h-5" /> },
        { key: "requests", label: "Solicitações ESO", icon: <ClipboardList className="w-5 h-5" /> },
        { key: "documents", label: "Documentos", icon: <FolderOpen className="w-5 h-5" /> },
        { key: "deadlines", label: "Prazos", icon: <Calendar className="w-5 h-5" /> },
        { key: "profile", label: "Perfil", icon: <User className="w-5 h-5" /> },
      ];
  }
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={theme === "light" ? "Modo escuro" : "Modo claro"}
      aria-label="Alternar tema"
    >
      {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}

function NotificationBell({ onNavigate }: { onNavigate: (key: PageKey) => void }) {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications(profile?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const recent = notifications.slice(0, 5);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</span>
            {unreadCount > 0 && (
              <button onClick={() => onNavigate("notifications")} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                Ver todas ({unreadCount} não lidas)
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhuma notificação</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {recent.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    if (n.request_id) onNavigate("request-detail");
                    else onNavigate("notifications");
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.is_read ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">{n.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatDateTime(n.created_at)}</p>
                </button>
              ))}
            </div>
          )}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => { onNavigate("notifications"); setOpen(false); }} className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium py-1">
              Ver todas as notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppLayout({
  current,
  onNavigate,
  children,
}: {
  current: PageKey;
  onNavigate: (key: PageKey) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!profile) return null;
  const items = navForRole(profile.role);
  const roleMeta = ROLE_META[profile.role];

  function handleNav(key: PageKey) {
    onNavigate(key);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <SidebarContent
          items={items}
          current={current}
          onNavigate={handleNav}
          profile={profile}
          roleLabel={roleMeta.label}
          onSignOut={signOut}
        />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 animate-in slide-in-from-left">
            <SidebarContent
              items={items}
              current={current}
              onNavigate={handleNav}
              profile={profile}
              roleLabel={roleMeta.label}
              onSignOut={signOut}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Perfil:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {roleMeta.short}
                </span>
              </div>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[160px] sm:max-w-xs">
                {profile.full_name || profile.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell onNavigate={onNavigate} />
              <ThemeToggle />
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  current,
  onNavigate,
  profile,
  roleLabel,
  onSignOut,
}: {
  items: NavItem[];
  current: PageKey;
  onNavigate: (key: PageKey) => void;
  profile: { full_name: string; email: string };
  roleLabel: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">CTES</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">Sistemas de Informação · UFRA</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              current === item.key
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <span className={cn(current === item.key ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500")}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-sm font-semibold shrink-0">
            {(profile.full_name || profile.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{profile.full_name || "Sem nome"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{roleLabel}</p>
          </div>
        </div>
      </div>
    </>
  );
}
