import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, setToken } from "./lib/api";
import { RolUsuario, User } from "./types/sses";
import { Sidebar, NavSection } from "./components/Sidebar";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EstrategiasPage } from "./pages/EstrategiasPage";
import { CatalogosPage } from "./pages/CatalogosPage";
import { AcompanamientosPage } from "./pages/AcompanamientosPage";
import { ReportesPage } from "./pages/ReportesPage";

function defaultSectionForRole(rol: RolUsuario): NavSection {
  if (rol === "ENTE_CONTROL" || rol === "ANALISTA_MINISTERIO") return "reportes";
  if (rol === "TUTOR") return "acompanamientos";
  return "estrategias";
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [section, setSection] = useState<NavSection>("resumen");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    apiFetch<User>("/api/auth/me")
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setInitializing(false));
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiFetch<{ access_token: string; user: User }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      setToken(res.access_token);
      setUser(res.user);
      setSection("resumen");
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async (rol: RolUsuario) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiFetch<{ access_token: string; user: User }>(
        "/api/auth/demo-login",
        {
          method: "POST",
          body: JSON.stringify({ rol }),
        }
      );
      setToken(res.access_token);
      setUser(res.user);
      setSection(defaultSectionForRole(res.user.rol));
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setSection("resumen");
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[#6c6c6c]">
        Inicializando SSES Piloto...
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onDemoLogin={handleDemoLogin}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f5f5f5]">
      <Sidebar
        user={user}
        active={section}
        onNavigate={setSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onSwitchRole={handleDemoLogin}
        onLogout={handleLogout}
        switchingRole={authLoading}
      />

      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-7xl mx-auto">
        {section === "resumen" && <DashboardPage user={user} />}
        {section === "estrategias" && <EstrategiasPage user={user} />}
        {section === "catalogos" && <CatalogosPage />}
        {section === "acompanamientos" && <AcompanamientosPage user={user} />}
        {section === "reportes" && <ReportesPage user={user} mode="reportes" />}
        {section === "auditoria" && <ReportesPage user={user} mode="auditoria" />}
      </main>
    </div>
  );
}

export default App;
