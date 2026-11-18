import React, { useState } from "react";
import { Building2, ArrowRight, ShieldCheck, Layers, ClipboardCheck, BarChart3 } from "lucide-react";
import { Button, Card, Input, Badge } from "../components/ui";
import { ROL_LABELS, RolUsuario } from "../types/sses";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onDemoLogin: (rol: RolUsuario) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DEMO_ROLES: {
  rol: RolUsuario;
  email: string;
  desc: string;
  icon: typeof Layers;
}[] = [
  {
    rol: "RESPONSABLE_ESTRATEGIAS",
    email: "responsable@mineducacion.gov.co",
    desc: "Crea estrategias por entidad, vincula estudiantes y gestiona bloqueos de edición.",
    icon: Layers,
  },
  {
    rol: "TUTOR",
    email: "tutor@mineducacion.gov.co",
    desc: "Registra acompañamientos mensuales (individual/grupal) y seguimientos semanales.",
    icon: ClipboardCheck,
  },
  {
    rol: "ANALISTA_MINISTERIO",
    email: "analista@mineducacion.gov.co",
    desc: "Genera reportes de desempeño de tutores, indicadores y exporta en CSV/PDF.",
    icon: BarChart3,
  },
  {
    rol: "ENTE_CONTROL",
    email: "control@contraloria.gov.co",
    desc: "Portal restringido y auditado para consulta y descarga de reportes de ley.",
    icon: ShieldCheck,
  },
];

export function LoginPage({
  onLogin,
  onDemoLogin,
  loading,
  error,
}: LoginPageProps) {
  const [email, setEmail] = useState("responsable@mineducacion.gov.co");
  const [password, setPassword] = useState("sses2026");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col justify-center py-10 px-4">
      <div className="max-w-5xl w-full mx-auto">
        {/* Institutional Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e1e1e1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#001923] text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[#000000]">
                Sistema de Seguimiento de Actividades Extracurriculares (SSES)
              </h1>
              <p className="text-xs text-[#6c6c6c]">
                Ministerio de Educación Nacional · Oficina de Tecnología · Piloto MVP
              </p>
            </div>
          </div>
          <Badge variant="ocean">Piloto Nacional 2026</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Standard Login Form */}
          <Card className="lg:col-span-5 p-6">
            <h2 className="text-base font-semibold text-[#000000]">
              Ingreso Institucional
            </h2>
            <p className="text-xs text-[#6c6c6c] mt-1 mb-5">
              Autentícate con tu cuenta institucional asignada para el piloto.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#434343] mb-1.5">
                  Correo institucional
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#434343] mb-1.5">
                  Contraseña
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Validando acceso..." : "Ingresar al SSES"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </Card>

          {/* Quick Role Demo Access */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#000000]">
                  Acceso Rápido por Rol (Entorno Demo)
                </h2>
                <p className="text-xs text-[#6c6c6c]">
                  Selecciona cualquier perfil para probar los permisos RBAC y flujos de negocio en 1 clic.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ROLES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.rol}
                    disabled={loading}
                    onClick={() => onDemoLogin(item.rol)}
                    className="text-left bg-white border border-[#e1e1e1] hover:border-[#000000] rounded-lg p-4 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded bg-[#ebebeb] group-hover:bg-[#001923] group-hover:text-white flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#939393] group-hover:text-[#000000]" />
                    </div>
                    <div className="text-sm font-semibold text-[#000000]">
                      {ROL_LABELS[item.rol]}
                    </div>
                    <div className="text-[11px] font-mono-code text-[#6c6c6c] mt-0.5 mb-2">
                      {item.email}
                    </div>
                    <p className="text-xs text-[#6c6c6c] leading-relaxed">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
