import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Docente, Entidad, Estudiante } from "../types/sses";
import { Badge, Button, Card, Input, Select } from "../components/ui";

export function CatalogosPage() {
  const [tab, setTab] = useState<"estudiantes" | "docentes" | "entidades">("estudiantes");
  const [q, setQ] = useState("");
  const [entidadId, setEntidadId] = useState<string>("");
  const [page, setPage] = useState(1);

  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [totalEstudiantes, setTotalEstudiantes] = useState(0);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Entidad[]>("/api/catalogos/entidades").then(setEntidades);
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === "estudiantes") {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (q.trim()) params.set("q", q.trim());
      if (entidadId) params.set("entidad_id", entidadId);
      apiFetch<{ total: number; items: Estudiante[] }>(
        `/api/catalogos/estudiantes?${params.toString()}`
      )
        .then((res) => {
          setEstudiantes(res.items);
          setTotalEstudiantes(res.total);
        })
        .finally(() => setLoading(false));
    } else if (tab === "docentes") {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (entidadId) params.set("entidad_id", entidadId);
      apiFetch<Docente[]>(`/api/catalogos/docentes?${params.toString()}`)
        .then(setDocentes)
        .finally(() => setLoading(false));
    } else {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      apiFetch<Entidad[]>(`/api/catalogos/entidades?${params.toString()}`)
        .then(setEntidades)
        .finally(() => setLoading(false));
    }
  }, [tab, q, entidadId, page]);

  const totalPages = Math.max(1, Math.ceil(totalEstudiantes / 25));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#000000]">
          Catálogos Precargados
        </h1>
        <p className="text-sm text-[#6c6c6c] mt-0.5">
          CU_005 · Consulta centralizada de estudiantes, docentes y entidades sin duplicación de registros.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e1e1e1] pb-3">
        {(
          [
            { id: "estudiantes", label: `Estudiantes (${totalEstudiantes || 200})` },
            { id: "docentes", label: "Docentes" },
            { id: "entidades", label: "Entidades" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border ${
              tab === t.id
                ? "bg-[#000000] text-white border-[#000000]"
                : "bg-white text-[#434343] border-[#e1e1e1] hover:bg-[#ebebeb]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#939393] absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar por nombre, documento o código..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        {tab !== "entidades" && (
          <div className="w-64">
            <Select
              value={entidadId}
              onChange={(e) => {
                setEntidadId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas las entidades</option>
              {entidades.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.nombre}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {/* Content */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {tab === "estudiantes" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e1e1e1] bg-[#fbfbfa] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Grado</th>
                  <th className="py-3 px-4">Entidad</th>
                  <th className="py-3 px-4">Correo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e1e1] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6c6c6c]">
                      Cargando estudiantes...
                    </td>
                  </tr>
                ) : (
                  estudiantes.map((s) => (
                    <tr key={s.id} className="hover:bg-[#fbfbfa]">
                      <td className="py-2.5 px-4 font-mono-code text-[#434343]">
                        {s.documento}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#000000]">
                        {s.nombre_completo}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="neutral">{s.grado}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-[#434343]">
                        {s.entidad_nombre}
                      </td>
                      <td className="py-2.5 px-4 text-[#6c6c6c]">{s.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === "docentes" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e1e1e1] bg-[#fbfbfa] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Docente</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4">Entidad</th>
                  <th className="py-3 px-4">Estrategias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e1e1] text-xs">
                {docentes.map((d) => (
                  <tr key={d.id} className="hover:bg-[#fbfbfa]">
                    <td className="py-2.5 px-4 font-mono-code text-[#434343]">
                      {d.documento}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#000000]">
                      {d.nombre_completo}
                    </td>
                    <td className="py-2.5 px-4 text-[#434343]">{d.area}</td>
                    <td className="py-2.5 px-4 text-[#434343]">
                      {d.entidad_nombre}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="ocean">
                        {d.estrategias_ids.length} asociada(s)
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "entidades" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e1e1e1] bg-[#fbfbfa] text-[11px] font-semibold uppercase tracking-wider text-[#6c6c6c]">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Entidad</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4">Municipio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e1e1] text-xs">
                {entidades.map((ent) => (
                  <tr key={ent.id} className="hover:bg-[#fbfbfa]">
                    <td className="py-2.5 px-4 font-mono-code">{ent.codigo}</td>
                    <td className="py-2.5 px-4 font-medium text-[#000000]">
                      {ent.nombre}
                    </td>
                    <td className="py-2.5 px-4 text-[#434343]">{ent.tipo}</td>
                    <td className="py-2.5 px-4 text-[#434343]">
                      {ent.departamento}
                    </td>
                    <td className="py-2.5 px-4 text-[#434343]">
                      {ent.municipio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {tab === "estudiantes" && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#e1e1e1] bg-[#fbfbfa] text-xs text-[#6c6c6c]">
            <span>
              Página {page} de {totalPages} · {totalEstudiantes} registros
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
