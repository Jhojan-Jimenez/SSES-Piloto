import {
  LayoutDashboard,
  Layers,
  Database,
  ClipboardCheck,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "./ui";
import { ROL_LABELS, RolUsuario, User } from "../types/sses";

export type NavSection =
  | "resumen"
  | "estrategias"
  | "catalogos"
  | "acompanamientos"
  | "reportes"
  | "auditoria";

interface SidebarProps {
  user: User;
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSwitchRole: (rol: RolUsuario) => void;
  onLogout: () => void;
  switchingRole: boolean;
}

const MENU_ITEMS: {
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
  roles: RolUsuario[];
}[] = [
  {
    id: "resumen",
    label: "Resumen General",
    icon: LayoutDashboard,
    roles: ["RESPONSABLE_ESTRATEGIAS", "TUTOR", "ANALISTA_MINISTERIO", "ENTE_CONTROL"],
  },
  {
    id: "estrategias",
    label: "Estrategias",
    icon: Layers,
    roles: ["RESPONSABLE_ESTRATEGIAS", "TUTOR", "ANALISTA_MINISTERIO"],
  },
  {
    id: "catalogos",
    label: "Catálogos Precargados",
    icon: Database,
    roles: ["RESPONSABLE_ESTRATEGIAS", "TUTOR", "ANALISTA_MINISTERIO"],
  },
  {
    id: "acompanamientos",
    label: "Acompañamientos",
    icon: ClipboardCheck,
    roles: ["TUTOR", "ANALISTA_MINISTERIO", "RESPONSABLE_ESTRATEGIAS"],
  },
  {
    id: "reportes",
    label: "Reportes y Control",
    icon: BarChart3,
    roles: ["ANALISTA_MINISTERIO", "ENTE_CONTROL"],
  },
  {
    id: "auditoria",
    label: "Bitácora Auditoría",
    icon: ShieldAlert,
    roles: ["ANALISTA_MINISTERIO", "ENTE_CONTROL"],
  },
];

const ALL_ROLES: RolUsuario[] = [
  "RESPONSABLE_ESTRATEGIAS",
  "TUTOR",
  "ANALISTA_MINISTERIO",
  "ENTE_CONTROL",
];

export function Sidebar({
  user,
  active,
  onNavigate,
  collapsed,
  onToggleCollapse,
  onSwitchRole,
  onLogout,
  switchingRole,
}: SidebarProps) {
  const visibleItems = MENU_ITEMS.filter((item) => item.roles.includes(user.rol));

  return (
    <aside
      className={cn(
        "no-print h-screen sticky top-0 bg-[#fbfbfa] border-r border-[#e1e1e1] flex flex-col justify-between transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div>
        {/* Workspace Header */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-[#e1e1e1]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-[#001923] text-white flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#000000] truncate">
                  SSES · Piloto
                </div>
                <div className="text-[11px] text-[#6c6c6c] truncate">
                  MinEducación Colombia
                </div>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir barra" : "Colapsar barra"}
            className="p-1.5 rounded hover:bg-[#e9e9e9] text-[#6c6c6c] cursor-pointer mx-auto"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-0.5">
          {!collapsed && (
            <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#939393]">
              Módulos
            </div>
          )}
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-[#e9e9e9] text-[#000000] font-medium"
                    : "text-[#434343] hover:bg-[#ebebeb]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0 text-[#434343]" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: Demo Role Switcher + User */}
      <div className="p-2.5 border-t border-[#e1e1e1] space-y-2.5">
        {!collapsed && (
          <div className="bg-white border border-[#e1e1e1] rounded-md p-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#939393] mb-1.5">
              Cambiar Rol (Demo)
            </div>
            <div className="grid grid-cols-1 gap-1">
              {ALL_ROLES.map((rol) => {
                const selected = user.rol === rol;
                return (
                  <button
                    key={rol}
                    disabled={switchingRole || selected}
                    onClick={() => onSwitchRole(rol)}
                    className={cn(
                      "text-left text-xs px-2 py-1 rounded transition-colors cursor-pointer truncate",
                      selected
                        ? "bg-[#001923] text-white font-medium"
                        : "text-[#434343] hover:bg-[#ebebeb]"
                    )}
                  >
                    {ROL_LABELS[rol]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-1">
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#000000] truncate">
                {user.nombre}
              </div>
              <div className="text-[11px] text-[#6c6c6c] truncate">
                {user.region}
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded hover:bg-[#e9e9e9] text-[#6c6c6c] cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
