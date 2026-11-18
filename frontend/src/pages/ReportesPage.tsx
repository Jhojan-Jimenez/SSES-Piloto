import { useEffect, useState } from "react";
import { Download, Printer, ShieldCheck } from "lucide-react";
import { apiFetch, downloadCsvReport } from "../lib/api";
import {
  ActividadReporte,
  EventoAuditoria,
  TutorDesempeno,
  User,
} from "../types/sses";
import { Badge, Button, Card, Select } from "../components/ui";

export function ReportesPage({
  user,
  mode,
}: {
  user: User;
  mode: "reportes" | "auditoria";
}) {
  const [tutores, setTutores] = useState<TutorDesempeno[]>([]);
  const [actividades, setActividades] = useState<ActividadReporte[]>([]);
  const [auditoria, setAuditoria] = useState<EventoAuditoria[]>([]);
  const [mes, setMes] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (mode === "reportes") {
      const params = new URLSearchParams();
      if (mes) params.set("mes", mes);
      if (modalidad) params.set("modalidad", modalidad);
      apiFetch<{ tutores: TutorDesempeno[]; actividades: ActividadReporte[] }>(
        `/api/reportes/desempeno-tutores?${params.toString()}`
      )
        .then((res) => {
          setTutores(res.tutores);
          setActividades(res.actividades);
        })
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    } else {
      apiFetch<EventoAuditoria[]>("/api/reportes/auditoria?limit=150")
        .then(setAuditoria)
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    }
  }, [mode, mes, modalidad]);

  const handleCsv = async () => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", mes);
    if (modalidad) params.set("modalidad", modalidad);
    await downloadCsvReport(params);
  };

  if (mode === "auditoria") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#000000]">
            Bitácora de Auditoría
          </h1>
          <p className="text-sm text-[#6c6c6c] mt-0.5">
            RQF_023 · Trazabilidad de accesos, ediciones bloqueadas y exportaciones de control.
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e1e1e1] bg-[#fbfbfa] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                  <th className="py-3 px-4">Fecha/Hora</th>
                  <th className="py-3 px-4">Usuario / Rol</th>
                  <th className="py-3 px-4">Acción</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e1e1] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6c6c6c]">
                      Cargando bitácora...
                    </td>
                  </tr>
                ) : (
                  auditoria.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#fbfbfa]">
                      <td className="py-2.5 px-4 font-mono-code text-[#6c6c6c] whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleString("es-CO")}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[#000000]">
                          {ev.usuario_email}
                        </div>
                        <div className="text-[11px] text-[#6c6c6c]">{ev.rol}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono-code">{ev.accion}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={ev.permitido ? "success" : "danger"}>
                          {ev.permitido ? "Permitido" : "Bloqueado"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-[#434343]">{ev.detalle}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 print-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#000000]">
            Reportes Institucionales y Ente de Control
          </h1>
          <p className="text-sm text-[#6c6c6c] mt-0.5">
            CU_008 & CU_009 · Desempeño de tutores, actividades y exportación oficial CSV / PDF.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Button variant="secondary" onClick={handleCsv}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {user.rol === "ENTE_CONTROL" && (
        <div className="p-3 rounded-md bg-[#001923] text-white text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Portal de Ente de Control activo. Todas las consultas y descargas de reportes quedan auditadas en bitácora oficial.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="no-print p-3 flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos los meses (2026)</option>
            <option value="8">Agosto 2026</option>
            <option value="9">Septiembre 2026</option>
            <option value="10">Octubre 2026</option>
            <option value="11">Noviembre 2026</option>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
          >
            <option value="">Todas las modalidades</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="GRUPAL">Grupal</option>
          </Select>
        </div>
      </Card>

      {/* Desempeño Tutores */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e1e1e1] bg-[#fbfbfa]">
          <h2 className="text-sm font-semibold text-[#000000]">
            Indicadores de Desempeño por Tutor
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e1e1e1] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                <th className="py-2.5 px-4">Tutor</th>
                <th className="py-2.5 px-4">Región</th>
                <th className="py-2.5 px-4">Acompañamientos</th>
                <th className="py-2.5 px-4">Individual / Grupal</th>
                <th className="py-2.5 px-4">Seguimientos</th>
                <th className="py-2.5 px-4">Avance Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e1e1] text-xs">
              {tutores.map((t) => (
                <tr key={t.tutor_id}>
                  <td className="py-2.5 px-4 font-medium text-[#000000]">
                    {t.tutor_nombre}
                  </td>
                  <td className="py-2.5 px-4 text-[#434343]">{t.tutor_region}</td>
                  <td className="py-2.5 px-4 font-mono-code">
                    {t.total_acompanamientos}
                  </td>
                  <td className="py-2.5 px-4 text-[#434343]">
                    {t.individuales} / {t.grupales}
                  </td>
                  <td className="py-2.5 px-4 font-mono-code">
                    {t.total_seguimientos}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant="success">{t.avance_promedio}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detalle Actividades */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e1e1e1] bg-[#fbfbfa] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#000000]">
            Detalle de Actividades ({actividades.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e1e1e1] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                <th className="py-2.5 px-4">Periodo</th>
                <th className="py-2.5 px-4">Estrategia</th>
                <th className="py-2.5 px-4">Entidad</th>
                <th className="py-2.5 px-4">Docente</th>
                <th className="py-2.5 px-4">Tutor</th>
                <th className="py-2.5 px-4">Modalidad</th>
                <th className="py-2.5 px-4">Avance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e1e1] text-xs">
              {actividades.map((act) => (
                <tr key={act.id}>
                  <td className="py-2 px-4 font-mono-code">{act.periodo}</td>
                  <td className="py-2 px-4 font-medium text-[#000000]">
                    {act.estrategia_codigo} · {act.estrategia_nombre}
                  </td>
                  <td className="py-2 px-4 text-[#434343]">{act.entidad}</td>
                  <td className="py-2 px-4 text-[#434343]">{act.docente}</td>
                  <td className="py-2 px-4 text-[#434343]">{act.tutor}</td>
                  <td className="py-2 px-4">
                    <Badge variant="neutral">{act.modalidad}</Badge>
                  </td>
                  <td className="py-2 px-4 font-mono-code">
                    {act.ultimo_avance}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
