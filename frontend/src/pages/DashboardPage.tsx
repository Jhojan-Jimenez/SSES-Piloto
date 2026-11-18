import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Layers,
  Lock,
  Unlock,
  ClipboardCheck,
  Activity,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { ResumenDashboard, ROL_LABELS, User } from "../types/sses";
import { Card, Badge } from "../components/ui";

export function DashboardPage({ user }: { user: User }) {
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<ResumenDashboard>("/api/reportes/resumen")
      .then(setResumen)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !resumen) {
    return (
      <div className="text-sm text-[#6c6c6c] py-12">
        Cargando indicadores del piloto SSES...
      </div>
    );
  }

  const maxLinea = Math.max(
    1,
    ...resumen.estrategias_por_linea.map((l) => l.cantidad)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#000000]">
            Resumen del Piloto SSES
          </h1>
          <p className="text-sm text-[#6c6c6c] mt-0.5">
            Consolidado centralizado de estrategias extracurriculares y acompañamientos pedagógicos.
          </p>
        </div>
        <Badge variant="ocean">Perfil activo: {ROL_LABELS[user.rol]}</Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-[#6c6c6c] mb-2">
            <span className="text-xs font-medium">Estudiantes Precargados</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-[#000000]">
            {resumen.total_estudiantes}
          </div>
          <div className="text-xs text-[#6c6c6c] mt-1">
            {resumen.total_vinculaciones} vinculaciones activas a estrategias
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-[#6c6c6c] mb-2">
            <span className="text-xs font-medium">Estrategias Estudiantiles</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-[#000000]">
            {resumen.total_estrategias}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="inline-flex items-center gap-1 text-[#434343]">
              <Lock className="w-3 h-3" /> {resumen.estrategias_bloqueadas} bloqueadas
            </span>
            <span className="text-[#939393]">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Unlock className="w-3 h-3" /> {resumen.estrategias_editables} editables
            </span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-[#6c6c6c] mb-2">
            <span className="text-xs font-medium">Acompañamientos Mensuales</span>
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-[#000000]">
            {resumen.total_acompanamientos}
          </div>
          <div className="text-xs text-[#6c6c6c] mt-1">
            {resumen.acompanamientos_individuales} individuales ·{" "}
            {resumen.acompanamientos_grupales} grupales
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-[#6c6c6c] mb-2">
            <span className="text-xs font-medium">Seguimientos Semanales</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-semibold text-[#000000]">
            {resumen.total_seguimientos}
          </div>
          <div className="text-xs text-[#6c6c6c] mt-1">
            En {resumen.total_entidades} entidades y {resumen.total_docentes} docentes
          </div>
        </Card>
      </div>

      {/* Distribution & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7 p-5">
          <h2 className="text-sm font-semibold text-[#000000] mb-1">
            Estrategias por Línea Temática
          </h2>
          <p className="text-xs text-[#6c6c6c] mb-4">
            Distribución actual de estrategias registradas en el piloto.
          </p>
          <div className="space-y-3">
            {resumen.estrategias_por_linea.map((item) => (
              <div key={item.linea}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#434343] font-medium">{item.linea}</span>
                  <span className="font-mono-code text-[#000000]">
                    {item.cantidad}
                  </span>
                </div>
                <div className="h-2 bg-[#ebebeb] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#001923] rounded-full"
                    style={{ width: `${(item.cantidad / maxLinea) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#001923]" />
            <h2 className="text-sm font-semibold text-[#000000]">
              Reglas de Integridad Activas
            </h2>
          </div>
          <div className="space-y-2.5 text-xs text-[#434343]">
            <div className="p-3 rounded bg-[#f5f5f5] border border-[#e1e1e1]">
              <div className="font-semibold text-[#000000]">
                RQF_005 · Bloqueo de Edición
              </div>
              <p className="text-[#6c6c6c] mt-0.5">
                Toda estrategia con ≥1 estudiante vinculado queda bloqueada transaccionalmente para proteger su historial.
              </p>
            </div>
            <div className="p-3 rounded bg-[#f5f5f5] border border-[#e1e1e1]">
              <div className="font-semibold text-[#000000]">
                RQF_008 · Cero Duplicados
              </div>
              <p className="text-[#6c6c6c] mt-0.5">
                Los estudiantes y docentes se seleccionan únicamente desde catálogos precargados con llaves únicas.
              </p>
            </div>
            <div className="p-3 rounded bg-[#f5f5f5] border border-[#e1e1e1]">
              <div className="font-semibold text-[#000000]">
                RQF_023 · Trazabilidad y Auditoría
              </div>
              <p className="text-[#6c6c6c] mt-0.5">
                Accesos, ediciones bloqueadas y exportaciones de Entes de Control quedan registrados en bitácora.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
