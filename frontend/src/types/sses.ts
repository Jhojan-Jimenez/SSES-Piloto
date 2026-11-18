export type RolUsuario =
  | "RESPONSABLE_ESTRATEGIAS"
  | "TUTOR"
  | "ANALISTA_MINISTERIO"
  | "ENTE_CONTROL";

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  region: string;
}

export interface Entidad {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  departamento: string;
  municipio: string;
}

export interface Estudiante {
  id: number;
  documento: string;
  nombre_completo: string;
  grado: string;
  email: string;
  entidad_id: number;
  entidad_nombre?: string;
}

export interface Docente {
  id: number;
  documento: string;
  nombre_completo: string;
  area: string;
  email: string;
  entidad_id: number;
  entidad_nombre?: string;
  estrategias_ids: number[];
}

export interface Estrategia {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  linea_tematica: string;
  periodo: string;
  estado: "ACTIVA" | "BORRADOR";
  entidad_id: number;
  entidad_nombre: string;
  estudiantes_vinculados_count: number;
  docentes_asociados_count: number;
  bloqueada_edicion: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstrategiaDetail extends Estrategia {
  estudiantes: Estudiante[];
  docentes: Docente[];
}

export interface SeguimientoSemanal {
  id: number;
  acompanamiento_id: number;
  semana: number;
  fecha: string;
  observaciones: string;
  avance_porcentaje: number;
  created_at: string;
}

export interface Acompanamiento {
  id: number;
  estrategia_id: number;
  estrategia_nombre: string;
  estrategia_codigo: string;
  docente_id: number;
  docente_nombre: string;
  tutor_id: number;
  tutor_nombre: string;
  anio: number;
  mes: number;
  modalidad: "INDIVIDUAL" | "GRUPAL";
  participantes_grupo?: string | null;
  descripcion: string;
  seguimientos_count: number;
  seguimientos: SeguimientoSemanal[];
  created_at: string;
}

export interface ResumenDashboard {
  total_entidades: number;
  total_estudiantes: number;
  total_docentes: number;
  total_estrategias: number;
  estrategias_bloqueadas: number;
  estrategias_editables: number;
  total_vinculaciones: number;
  total_acompanamientos: number;
  total_seguimientos: number;
  acompanamientos_individuales: number;
  acompanamientos_grupales: number;
  estrategias_por_linea: { linea: string; cantidad: number }[];
}

export interface TutorDesempeno {
  tutor_id: number;
  tutor_nombre: string;
  tutor_region: string;
  total_acompanamientos: number;
  individuales: number;
  grupales: number;
  total_seguimientos: number;
  avance_promedio: number;
}

export interface ActividadReporte {
  id: number;
  periodo: string;
  estrategia_codigo: string;
  estrategia_nombre: string;
  entidad: string;
  docente: string;
  tutor: string;
  modalidad: string;
  seguimientos_count: number;
  ultimo_avance: number;
}

export interface EventoAuditoria {
  id: number;
  usuario_email: string;
  rol: string;
  accion: string;
  entidad_afectada: string;
  entidad_id?: string | null;
  detalle: string;
  permitido: boolean;
  created_at: string;
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  RESPONSABLE_ESTRATEGIAS: "Responsable de Estrategias",
  TUTOR: "Tutor Pedagógico",
  ANALISTA_MINISTERIO: "Analista del Ministerio",
  ENTE_CONTROL: "Ente de Control",
};
