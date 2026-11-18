import React, { useEffect, useState } from "react";
import {
  Plus,
  Lock,
  Unlock,
  Pencil,
  UserPlus,
  Eye,
  Search,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  Docente,
  Entidad,
  Estrategia,
  EstrategiaDetail,
  Estudiante,
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

const LINEAS = [
  "STEM y Tecnología",
  "Lectura y Escritura",
  "Deporte y Recreación",
  "Arte y Cultura",
  "Medio Ambiente",
  "Ciudadanía",
  "Idiomas",
];

export function EstrategiasPage({ user }: { user: User }) {
  const [estrategias, setEstrategias] = useState<Estrategia[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtroBloqueo, setFiltroBloqueo] = useState<"todas" | "editables" | "bloqueadas">("todas");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Estrategia | null>(null);
  const [linking, setLinking] = useState<Estrategia | null>(null);
  const [detail, setDetail] = useState<EstrategiaDetail | null>(null);

  // Create form
  const [cCodigo, setCCodigo] = useState("");
  const [cNombre, setCNombre] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cLinea, setCLinea] = useState(LINEAS[0]);
  const [cPeriodo, setCPeriodo] = useState("2026-2");
  const [cEntidadId, setCEntidadId] = useState<number>(1);
  const [cDocentesIds, setCDocentesIds] = useState<number[]>([]);

  // Edit form
  const [eNombre, setENombre] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eLinea, setELinea] = useState("");

  // Link students modal state
  const [estSearch, setEstSearch] = useState("");
  const [estResults, setEstResults] = useState<Estudiante[]>([]);
  const [selectedEstIds, setSelectedEstIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user.rol === "RESPONSABLE_ESTRATEGIAS";

  const loadData = async () => {
    setLoading(true);
    try {
      const [ests, ents, docs] = await Promise.all([
        apiFetch<Estrategia[]>("/api/estrategias"),
        apiFetch<Entidad[]>("/api/catalogos/entidades"),
        apiFetch<Docente[]>("/api/catalogos/docentes"),
      ]);
      setEstrategias(ests);
      setEntidades(ents);
      setDocentes(docs);
      if (ents.length > 0 && cEntidadId === 1) {
        setCEntidadId(ents[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!linking) return;
    const params = new URLSearchParams({ limit: "40", page: "1" });
    if (estSearch.trim()) params.set("q", estSearch.trim());
    apiFetch<{ items: Estudiante[] }>(`/api/catalogos/estudiantes?${params.toString()}`).then(
      (res) => setEstResults(res.items)
    );
  }, [linking, estSearch]);

  const filtered = estrategias.filter((e) => {
    const matchQ =
      !q.trim() ||
      e.nombre.toLowerCase().includes(q.toLowerCase()) ||
      e.codigo.toLowerCase().includes(q.toLowerCase()) ||
      e.entidad_nombre.toLowerCase().includes(q.toLowerCase());
    const matchLock =
      filtroBloqueo === "todas" ||
      (filtroBloqueo === "bloqueadas" && e.bloqueada_edicion) ||
      (filtroBloqueo === "editables" && !e.bloqueada_edicion);
    return matchQ && matchLock;
  });

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiFetch("/api/estrategias", {
        method: "POST",
        body: JSON.stringify({
          codigo: cCodigo,
          nombre: cNombre,
          descripcion: cDesc,
          linea_tematica: cLinea,
          periodo: cPeriodo,
          entidad_id: Number(cEntidadId),
          docentes_ids: cDocentesIds,
        }),
      });
      setShowCreate(false);
      setCCodigo("");
      setCNombre("");
      setCDesc("");
      setCDocentesIds([]);
      setFeedback({ type: "ok", msg: "Estrategia creada correctamente." });
      await loadData();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (est: Estrategia) => {
    setEditing(est);
    setENombre(est.nombre);
    setEDesc(est.descripcion);
    setELinea(est.linea_tematica);
    setFeedback(null);
  };

  const handleEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/estrategias/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: eNombre,
          descripcion: eDesc,
          linea_tematica: eLinea,
        }),
      });
      setEditing(null);
      setFeedback({ type: "ok", msg: `Estrategia ${editing.codigo} actualizada.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVincular = async () => {
    if (!linking || selectedEstIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        vinculados_nuevos: number;
        total_vinculados: number;
      }>(`/api/estrategias/${linking.id}/vincular-estudiantes`, {
        method: "POST",
        body: JSON.stringify({ estudiantes_ids: selectedEstIds }),
      });
      setLinking(null);
      setSelectedEstIds([]);
      setEstSearch("");
      setFeedback({
        type: "ok",
        msg: `Se vincularon ${res.vinculados_nuevos} estudiante(s) a ${linking.codigo}. Edición bloqueada automáticamente.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id: number) => {
    const data = await apiFetch<EstrategiaDetail>(`/api/estrategias/${id}`);
    setDetail(data);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#000000]">
            Estrategias Estudiantiles
          </h1>
          <p className="text-sm text-[#6c6c6c] mt-0.5">
            Gestión por entidad, vinculación de estudiantes precargados y bloqueo transaccional de edición.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nueva Estrategia
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="p-3 rounded-md bg-white border border-[#e1e1e1] text-xs text-[#6c6c6c]">
          Modo solo lectura para tu perfil. Para crear estrategias o vincular estudiantes, cambia al rol{" "}
          <span className="font-semibold text-[#000000]">Responsable de Estrategias</span> en la barra lateral.
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
          <button
            onClick={() => setFeedback(null)}
            className="underline cursor-pointer ml-4"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#939393] absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar por código, nombre o entidad..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(["todas", "editables", "bloqueadas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroBloqueo(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer capitalize border ${
                filtroBloqueo === f
                  ? "bg-[#000000] text-white border-[#000000]"
                  : "bg-[#ebebeb] text-[#434343] border-[#e1e1e1] hover:bg-[#e1e1e1]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e1e1e1] bg-[#fbfbfa] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                <th className="py-3 px-4">Código / Estrategia</th>
                <th className="py-3 px-4">Entidad Asociada</th>
                <th className="py-3 px-4">Línea</th>
                <th className="py-3 px-4">Estudiantes</th>
                <th className="py-3 px-4">Integridad</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e1e1] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6c6c6c]">
                    Cargando estrategias...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6c6c6c]">
                    No hay estrategias que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((est) => (
                  <tr key={est.id} className="hover:bg-[#fbfbfa]">
                    <td className="py-3 px-4">
                      <div className="font-mono-code text-xs text-[#6c6c6c]">
                        {est.codigo}
                      </div>
                      <div className="font-medium text-[#000000]">
                        {est.nombre}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#434343]">
                      {est.entidad_nombre}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral">{est.linea_tematica}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono-code text-xs">
                      {est.estudiantes_vinculados_count}
                    </td>
                    <td className="py-3 px-4">
                      {est.bloqueada_edicion ? (
                        <Badge variant="warning">
                          <Lock className="w-3 h-3" /> Bloqueada
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <Unlock className="w-3 h-3" /> Editable
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetail(est.id)}
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(est)}
                              title={
                                est.bloqueada_edicion
                                  ? "Bloqueada por tener estudiantes vinculados"
                                  : "Editar estrategia"
                              }
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setLinking(est);
                                setSelectedEstIds([]);
                              }}
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Vincular
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Crear */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Crear Estrategia Estudiantil"
        subtitle="CU_002 · Asociada obligatoriamente a una entidad precargada."
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Código
              </label>
              <Input
                placeholder="EST-2026-15"
                value={cCodigo}
                onChange={(e) => setCCodigo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Periodo
              </label>
              <Input
                value={cPeriodo}
                onChange={(e) => setCPeriodo(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Nombre de la estrategia
            </label>
            <Input
              placeholder="Ej. Semillero de Programación Juvenil"
              value={cNombre}
              onChange={(e) => setCNombre(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Entidad precargada
              </label>
              <Select
                value={cEntidadId}
                onChange={(e) => setCEntidadId(Number(e.target.value))}
              >
                {entidades.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.nombre} ({ent.municipio})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Línea temática
              </label>
              <Select
                value={cLinea}
                onChange={(e) => setCLinea(e.target.value)}
              >
                {LINEAS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Descripción
            </label>
            <Textarea
              rows={3}
              placeholder="Objetivo pedagógico y alcance..."
              value={cDesc}
              onChange={(e) => setCDesc(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#434343] mb-1">
              Asociar Docentes (opcional, requerido para acompañamientos)
            </label>
            <div className="max-h-32 overflow-y-auto border border-[#e1e1e1] rounded-md p-2 space-y-1 bg-[#fbfbfa]">
              {docentes.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 text-xs text-[#434343] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={cDocentesIds.includes(d.id)}
                    onChange={(ev) => {
                      if (ev.target.checked) {
                        setCDocentesIds([...cDocentesIds, d.id]);
                      } else {
                        setCDocentesIds(cDocentesIds.filter((id) => id !== d.id));
                      }
                    }}
                  />
                  <span>{d.nombre_completo}</span>
                  <span className="text-[#939393]">({d.area})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Crear Estrategia"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Editar Estrategia · ${editing?.codigo ?? ""}`}
        subtitle="CU_003 / RQF_005 · Solo editable si tiene 0 estudiantes vinculados."
      >
        {editing && (
          <form onSubmit={handleEdit} className="space-y-4">
            {editing.bloqueada_edicion && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Edición bloqueada por regla de integridad</div>
                  <p className="mt-0.5">
                    Esta estrategia ya tiene {editing.estudiantes_vinculados_count} estudiante(s) vinculado(s).
                    Si intentas guardar, el servidor rechazará la transacción (HTTP 409) y registrará el intento en auditoría.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Nombre
              </label>
              <Input
                value={eNombre}
                onChange={(e) => setENombre(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Línea temática
              </label>
              <Select value={eLinea} onChange={(e) => setELinea(e.target.value)}>
                {LINEAS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#434343] mb-1">
                Descripción
              </label>
              <Textarea
                rows={3}
                value={eDesc}
                onChange={(e) => setEDesc(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(null)}
              >
                Cerrar
              </Button>
              <Button type="submit" disabled={submitting}>
                {editing.bloqueada_edicion
                  ? "Probar Validación Servidor (409)"
                  : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Vincular Estudiantes */}
      <Modal
        open={!!linking}
        onClose={() => setLinking(null)}
        title={`Vincular Estudiantes · ${linking?.codigo ?? ""}`}
        subtitle="CU_004 · Selecciona estudiantes precargados. Al vincular al menos uno, la estrategia quedará bloqueada para edición."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#939393] absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar estudiante precargado por nombre o documento..."
              value={estSearch}
              onChange={(e) => setEstSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border border-[#e1e1e1] rounded-md divide-y divide-[#e1e1e1]">
            {estResults.map((est) => {
              const checked = selectedEstIds.includes(est.id);
              return (
                <label
                  key={est.id}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#fbfbfa] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(ev) => {
                        if (ev.target.checked) {
                          setSelectedEstIds([...selectedEstIds, est.id]);
                        } else {
                          setSelectedEstIds(
                            selectedEstIds.filter((id) => id !== est.id)
                          );
                        }
                      }}
                    />
                    <div>
                      <div className="font-medium text-[#000000]">
                        {est.nombre_completo}
                      </div>
                      <div className="text-[#6c6c6c]">
                        Doc: {est.documento} · {est.entidad_nombre}
                      </div>
                    </div>
                  </div>
                  <Badge variant="neutral">{est.grado}</Badge>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#6c6c6c]">
              {selectedEstIds.length} estudiante(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setLinking(null)}>
                Cancelar
              </Button>
              <Button
                disabled={selectedEstIds.length === 0 || submitting}
                onClick={handleVincular}
              >
                {submitting ? "Vinculando..." : "Confirmar Vinculación"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Detalle */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.codigo} — ${detail.nombre}` : ""}
        subtitle={detail?.entidad_nombre}
        maxWidth="max-w-2xl"
      >
        {detail && (
          <div className="space-y-4 text-xs">
            <p className="text-[#434343]">{detail.descripcion}</p>
            <div className="flex gap-2">
              <Badge variant="neutral">{detail.linea_tematica}</Badge>
              <Badge variant={detail.bloqueada_edicion ? "warning" : "success"}>
                {detail.bloqueada_edicion ? "Edición Bloqueada" : "Editable"}
              </Badge>
            </div>

            <div>
              <h4 className="font-semibold text-[#000000] mb-1.5">
                Docentes Asociados ({detail.docentes.length})
              </h4>
              <div className="border border-[#e1e1e1] rounded-md divide-y divide-[#e1e1e1]">
                {detail.docentes.length === 0 ? (
                  <div className="p-2.5 text-[#6c6c6c]">Sin docentes asociados.</div>
                ) : (
                  detail.docentes.map((d) => (
                    <div key={d.id} className="p-2.5 flex justify-between">
                      <span className="font-medium">{d.nombre_completo}</span>
                      <span className="text-[#6c6c6c]">{d.area}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[#000000] mb-1.5">
                Estudiantes Vinculados ({detail.estudiantes.length})
              </h4>
              <div className="max-h-48 overflow-y-auto border border-[#e1e1e1] rounded-md divide-y divide-[#e1e1e1]">
                {detail.estudiantes.length === 0 ? (
                  <div className="p-2.5 text-[#6c6c6c]">
                    Aún no hay estudiantes vinculados (estrategia editable).
                  </div>
                ) : (
                  detail.estudiantes.map((s) => (
                    <div key={s.id} className="p-2 flex justify-between">
                      <span>{s.nombre_completo}</span>
                      <span className="font-mono-code text-[#6c6c6c]">
                        {s.documento} · {s.grado}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
