import React, { useEffect, useState } from "react";
import { Plus, Calendar, Users, User as UserIcon, ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  Acompanamiento,
  Docente,
  Estrategia,
  User,
} from "../types/sses";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Textarea,
} from "../components/ui";

const MESES = [
  { v: 1, l: "Enero" },
  { v: 2, l: "Febrero" },
  { v: 3, l: "Marzo" },
  { v: 4, l: "Abril" },
  { v: 5, l: "Mayo" },
  { v: 6, l: "Junio" },
  { v: 7, l: "Julio" },
  { v: 8, l: "Agosto" },
  { v: 9, l: "Septiembre" },
  { v: 10, l: "Octubre" },
  { v: 11, l: "Noviembre" },
  { v: 12, l: "Diciembre" },
];

export function AcompanamientosPage({ user }: { user: User }) {
  const [items, setItems] = useState<Acompanamiento[]>([]);
  const [estrategias, setEstrategias] = useState<Estrategia[]>([]);
  const [docentesEstrategia, setDocentesEstrategia] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filtroModalidad, setFiltroModalidad] = useState<string>("");
  const [filtroMes, setFiltroMes] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [estrategiaId, setEstrategiaId] = useState<number>(0);
  const [docenteId, setDocenteId] = useState<number>(0);
  const [anio, setAnio] = useState<number>(2026);
  const [mes, setMes] = useState<number>(11);
  const [modalidad, setModalidad] = useState<"INDIVIDUAL" | "GRUPAL">("INDIVIDUAL");
  const [participantes, setParticipantes] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Add weekly follow-up modal
  const [segTarget, setSegTarget] = useState<Acompanamiento | null>(null);
  const [segSemana, setSegSemana] = useState(1);
  const [segFecha, setSegFecha] = useState("2026-11-18");
  const [segAvance, setSegAvance] = useState(50);
  const [segObs, setSegObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canRegister = user.rol === "TUTOR";

  const loadAcomp = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroModalidad) params.set("modalidad", filtroModalidad);
      if (filtroMes) params.set("mes", filtroMes);
      const [acomps, ests] = await Promise.all([
        apiFetch<Acompanamiento[]>(`/api/acompanamientos?${params.toString()}`),
        apiFetch<Estrategia[]>("/api/estrategias"),
      ]);
      setItems(acomps);
      setEstrategias(ests);
      if (ests.length > 0 && estrategiaId === 0) {
        setEstrategiaId(ests[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcomp();
  }, [filtroModalidad, filtroMes]);

  useEffect(() => {
    if (!estrategiaId) return;
    apiFetch<Docente[]>(`/api/catalogos/docentes?estrategia_id=${estrategiaId}`).then(
      (docs) => {
        setDocentesEstrategia(docs);
        setDocenteId(docs.length > 0 ? docs[0].id : 0);
      }
    );
  }, [estrategiaId]);

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiFetch("/api/acompanamientos", {
        method: "POST",
        body: JSON.stringify({
          estrategia_id: estrategiaId,
          docente_id: docenteId,
          anio,
          mes,
          modalidad,
          participantes_grupo: modalidad === "GRUPAL" ? participantes : null,
          descripcion,
        }),
      });
      setShowCreate(false);
      setDescripcion("");
      setParticipantes("");
      setFeedback({ type: "ok", msg: "Acompañamiento mensual registrado." });
      await loadAcomp();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const openSegModal = (acomp: Acompanamiento) => {
    setSegTarget(acomp);
    const nextSem = Math.min(5, acomp.seguimientos.length + 1);
    setSegSemana(nextSem);
    const defaultDay = String(Math.min(28, nextSem * 6)).padStart(2, "0");
    setSegFecha(`${acomp.anio}-${String(acomp.mes).padStart(2, "0")}-${defaultDay}`);
    setSegObs("");
    setSegAvance(Math.min(100, nextSem * 25));
  };

  const handleAddSeg = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!segTarget) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/acompanamientos/${segTarget.id}/seguimientos`, {
        method: "POST",
        body: JSON.stringify({
          semana: Number(segSemana),
          fecha: segFecha,
          observaciones: segObs,
          avance_porcentaje: Number(segAvance),
        }),
      });
      setSegTarget(null);
      setFeedback({ type: "ok", msg: "Seguimiento semanal guardado." });
      await loadAcomp();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#000000]">
            Acompañamientos Pedagógicos
          </h1>
          <p className="text-sm text-[#6c6c6c] mt-0.5">
            CU_006 & CU_007 · Registro mensual (Individual / Grupal) con seguimiento semanal.
          </p>
        </div>
        {canRegister && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nuevo Acompañamiento
          </Button>
        )}
      </div>

      {!canRegister && (
        <div className="p-3 rounded-md bg-white border border-[#e1e1e1] text-xs text-[#6c6c6c]">
          Vista de consulta. Para registrar acompañamientos o seguimientos semanales, cambia al rol{" "}
          <span className="font-semibold text-[#000000]">Tutor Pedagógico</span> en la barra lateral.
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="underline cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            value={filtroModalidad}
            onChange={(e) => setFiltroModalidad(e.target.value)}
          >
            <option value="">Todas las modalidades</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="GRUPAL">Grupal</option>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
          >
            <option value="">Todos los meses</option>
            {MESES.map((m) => (
              <option key={m.v} value={m.v}>
                {m.l} 2026
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-8 text-center text-xs text-[#6c6c6c]">
            Cargando acompañamientos...
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#6c6c6c]">
            No hay acompañamientos para los filtros seleccionados.
          </Card>
        ) : (
          items.map((a) => {
            const expanded = expandedId === a.id;
            return (
              <Card key={a.id} className="overflow-hidden">
                <div
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-[#fbfbfa]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-code text-xs text-[#6c6c6c]">
                        {a.estrategia_codigo}
                      </span>
                      <span className="text-sm font-semibold text-[#000000]">
                        {a.estrategia_nombre}
                      </span>
                      <Badge variant={a.modalidad === "GRUPAL" ? "ocean" : "neutral"}>
                        {a.modalidad === "GRUPAL" ? (
                          <Users className="w-3 h-3" />
                        ) : (
                          <UserIcon className="w-3 h-3" />
                        )}
                        {a.modalidad}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#6c6c6c]">
                      Docente: <span className="text-[#434343] font-medium">{a.docente_nombre}</span> · Tutor:{" "}
                      <span className="text-[#434343]">{a.tutor_nombre}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 text-xs font-medium text-[#000000]">
                        <Calendar className="w-3.5 h-3.5 text-[#6c6c6c]" />
                        {a.anio}-{String(a.mes).padStart(2, "0")}
                      </div>
                      <div className="text-[11px] text-[#6c6c6c]">
                        {a.seguimientos_count} seguimiento(s) semanal(es)
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="w-4 h-4 text-[#6c6c6c]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#6c6c6c]" />
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#e1e1e1] bg-[#fbfbfa] p-4 space-y-3">
                    <div className="text-xs text-[#434343]">
                      <span className="font-semibold">Descripción:</span> {a.descripcion}
                      {a.participantes_grupo && (
                        <div className="mt-1">
                          <span className="font-semibold">Participantes grupo:</span>{" "}
                          {a.participantes_grupo}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6c6c6c]">
                        Seguimientos Semanales
                      </h4>
                      {canRegister && (
                        <Button size="sm" onClick={() => openSegModal(a)}>
                          <Plus className="w-3.5 h-3.5" /> Agregar Semana
                        </Button>
                      )}
                    </div>

                    {a.seguimientos.length === 0 ? (
                      <div className="text-xs text-[#6c6c6c] italic">
                        Sin seguimientos semanales registrados todavía.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {a.seguimientos.map((s) => (
                          <div
                            key={s.id}
                            className="bg-white border border-[#e1e1e1] rounded-md p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#000000]">
                                Semana {s.semana}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono-code text-[#6c6c6c]">
                                  {s.fecha}
                                </span>
                                <Badge variant="success">{s.avance_porcentaje}%</Badge>
                              </div>
                            </div>
                            <p className="text-[#434343]">{s.observaciones}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Nuevo Acompañamiento */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Registrar Acompañamiento Mensual"
        subtitle="CU_006 / RQF_012 · Solo docentes asociados a la estrategia seleccionada."
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Estrategia
            </label>
            <Select
              value={estrategiaId}
              onChange={(e) => setEstrategiaId(Number(e.target.value))}
            >
              {estrategias.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.codigo} — {est.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Docente asociado
            </label>
            <Select
              value={docenteId}
              onChange={(e) => setDocenteId(Number(e.target.value))}
              required
            >
              {docentesEstrategia.length === 0 ? (
                <option value={0}>No hay docentes asociados a esta estrategia</option>
              ) : (
                docentesEstrategia.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre_completo} ({d.area})
                  </option>
                ))
              )}
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Año
              </label>
              <Input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Mes
              </label>
              <Select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
              >
                {MESES.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Modalidad
              </label>
              <Select
                value={modalidad}
                onChange={(e) =>
                  setModalidad(e.target.value as "INDIVIDUAL" | "GRUPAL")
                }
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="GRUPAL">Grupal</option>
              </Select>
            </div>
          </div>

          {modalidad === "GRUPAL" && (
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Participantes del grupo
              </label>
              <Input
                placeholder="Ej. 4 docentes de área STEM"
                value={participantes}
                onChange={(e) => setParticipantes(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Descripción del acompañamiento
            </label>
            <Textarea
              rows={3}
              placeholder="Objetivos pedagógicos del mes..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || docenteId === 0}
            >
              {submitting ? "Guardando..." : "Registrar Acompañamiento"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Seguimiento Semanal */}
      <Modal
        open={!!segTarget}
        onClose={() => setSegTarget(null)}
        title="Agregar Seguimiento Semanal"
        subtitle={
          segTarget
            ? `CU_007 · Periodo ${segTarget.anio}-${String(segTarget.mes).padStart(2, "0")} · ${segTarget.docente_nombre}`
            : ""
        }
      >
        <form onSubmit={handleAddSeg} className="space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Semana (1–5)
              </label>
              <Input
                type="number"
                min={1}
                max={5}
                value={segSemana}
                onChange={(e) => setSegSemana(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Fecha
              </label>
              <Input
                type="date"
                value={segFecha}
                onChange={(e) => setSegFecha(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Avance (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={segAvance}
                onChange={(e) => setSegAvance(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Observaciones de la semana
            </label>
            <Textarea
              rows={3}
              placeholder="Avances, acuerdos y evidencias..."
              value={segObs}
              onChange={(e) => setSegObs(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSegTarget(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Seguimiento"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
