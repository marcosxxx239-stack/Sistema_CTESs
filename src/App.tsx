import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoginPage } from "@/pages/LoginPage";
import { AppLayout, type PageKey } from "@/components/AppLayout";
import { StudentDashboard } from "@/pages/StudentDashboard";
import { CtesDashboard } from "@/pages/CtesDashboard";
import { AdvisorSupervisorDashboard } from "@/pages/AdvisorSupervisorDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { ActivitiesPage } from "@/pages/ActivitiesPage";
import { NewRequestPage } from "@/pages/NewRequestPage";
import { FormPage } from "@/pages/FormPage";
import { RequestDetailPage } from "@/pages/RequestDetailPage";
import { RequestsPage, CtesRequestsPage } from "@/pages/RequestsPage";
import { DeadlinesPage } from "@/pages/DeadlinesPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { LibraryDocumentsPage } from "@/pages/LibraryDocumentsPage";
import { OrientandosPage, SupervisionadosPage } from "@/pages/AdvisorSupervisorPages";
import { UsersPage } from "@/pages/UsersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { Spinner } from "@/components/ui";
import type { Role } from "@/lib/types";

// Pages that require CTES or Admin role
const CTES_ADMIN_ONLY: PageKey[] = ["ctes-requests", "users", "settings", "library"];

// Pages restricted to advisor only
const ADVISOR_ONLY: PageKey[] = ["orientandos"];

// Pages restricted to supervisor only
const SUPERVISOR_ONLY: PageKey[] = ["supervisionados"];

function isPageAllowed(role: Role, page: PageKey): boolean {
  if (CTES_ADMIN_ONLY.includes(page) && role !== "ctes" && role !== "admin") return false;
  if (ADVISOR_ONLY.includes(page) && role !== "advisor") return false;
  if (SUPERVISOR_ONLY.includes(page) && role !== "supervisor") return false;
  return true;
}

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [ctx, setCtx] = useState<Record<string, string>>({});

  useEffect(() => {
    setPage("dashboard");
    setCtx({});
  }, [profile?.id]);

  function navigate(key: PageKey, context?: Record<string, string>) {
    if (profile && !isPageAllowed(profile.role, key)) {
      setPage("dashboard");
      setCtx({});
      return;
    }
    setPage(key);
    setCtx(context ?? {});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-10 h-10 text-emerald-600" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginPage />;
  }

  // Guard: if current page is not allowed for this role, redirect to dashboard
  if (!isPageAllowed(profile.role, page)) {
    setPage("dashboard");
  }

  function renderPage() {
    switch (page) {
      case "dashboard":
        if (profile!.role === "student") return <StudentDashboard onNavigate={navigate} />;
        if (profile!.role === "ctes") return <CtesDashboard onNavigate={navigate} />;
        if (profile!.role === "admin") return <AdminDashboard onNavigate={navigate} />;
        return <AdvisorSupervisorDashboard onNavigate={navigate} />;

      case "activities":
        return <ActivitiesPage onNavigate={navigate} />;

      case "new-request":
        return <NewRequestPage activityId={ctx.activityId} onNavigate={navigate} />;

      case "form":
        return <FormPage requestId={ctx.id} onNavigate={navigate} />;

      case "request-detail":
        return <RequestDetailPage requestId={ctx.id} onNavigate={navigate} />;

      case "requests":
        return <RequestsPage onNavigate={navigate} />;

      case "ctes-requests":
        return <CtesRequestsPage onNavigate={navigate} />;

      case "documents":
        return <DocumentsPage onNavigate={navigate} />;

      case "library":
        return <LibraryDocumentsPage />;

      case "deadlines":
        return <DeadlinesPage />;

      case "history":
        return <HistoryPage />;

      case "notifications":
        return <NotificationsPage onNavigate={navigate} />;

      case "profile":
        return <ProfilePage />;

      case "orientandos":
        return <OrientandosPage onNavigate={navigate} />;

      case "supervisionados":
        return <SupervisionadosPage onNavigate={navigate} />;

      case "users":
        return <UsersPage />;

      case "settings":
        return <SettingsPage />;

      default:
        return <StudentDashboard onNavigate={navigate} />;
    }
  }

  return (
    <AppLayout current={page} onNavigate={navigate}>
      {renderPage()}
    </AppLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
