from datetime import datetime, date
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class DemoLoginRequest(BaseModel):
    rol: Literal[
        "RESPONSABLE_ESTRATEGIAS",
        "TUTOR",
        "ANALISTA_MINISTERIO",
        "ENTE_CONTROL",
    ]


class UserOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    region: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EntidadOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    tipo: str
    departamento: str
    municipio: str

    class Config:
        from_attributes = True


class EstudianteOut(BaseModel):
    id: int
    documento: str
    nombre_completo: str
    grado: str
    email: str
    entidad_id: int
    entidad_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class DocenteOut(BaseModel):
    id: int
    documento: str
    nombre_completo: str
    area: str
    email: str
    entidad_id: int
    entidad_nombre: Optional[str] = None
    estrategias_ids: List[int] = []

    class Config:
        from_attributes = True


class EstrategiaCreate(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=30)
    nombre: str = Field(..., min_length=3, max_length=200)
    descripcion: str = Field(..., min_length=5)
    linea_tematica: str = Field(..., min_length=2, max_length=120)
    periodo: str = Field(default="2026-2", max_length=40)
    entidad_id: int
    docentes_ids: List[int] = []


class EstrategiaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=200)
    descripcion: Optional[str] = Field(None, min_length=5)
    linea_tematica: Optional[str] = Field(None, min_length=2, max_length=120)
    periodo: Optional[str] = Field(None, max_length=40)
    estado: Optional[Literal["ACTIVA", "BORRADOR"]] = None
    entidad_id: Optional[int] = None


class VincularEstudiantesRequest(BaseModel):
    estudiantes_ids: List[int] = Field(..., min_length=1)


class AsociarDocentesRequest(BaseModel):
    docentes_ids: List[int] = Field(..., min_length=1)


class EstrategiaOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    descripcion: str
    linea_tematica: str
    periodo: str
    estado: str
    entidad_id: int
    entidad_nombre: str
    estudiantes_vinculados_count: int
    docentes_asociados_count: int
    bloqueada_edicion: bool
    created_at: datetime
    updated_at: datetime


class EstrategiaDetailOut(EstrategiaOut):
    estudiantes: List[EstudianteOut] = []
    docentes: List[DocenteOut] = []


class SeguimientoCreate(BaseModel):
    semana: int = Field(..., ge=1, le=5)
    fecha: date
    observaciones: str = Field(..., min_length=5)
    avance_porcentaje: int = Field(..., ge=0, le=100)


class SeguimientoOut(BaseModel):
    id: int
    acompanamiento_id: int
    semana: int
    fecha: date
    observaciones: str
    avance_porcentaje: int
    created_at: datetime

    class Config:
        from_attributes = True


class AcompanamientoCreate(BaseModel):
    estrategia_id: int
    docente_id: int
    anio: int = Field(..., ge=2024, le=2030)
    mes: int = Field(..., ge=1, le=12)
    modalidad: Literal["INDIVIDUAL", "GRUPAL"]
    participantes_grupo: Optional[str] = None
    descripcion: str = Field(..., min_length=5)


class AcompanamientoOut(BaseModel):
    id: int
    estrategia_id: int
    estrategia_nombre: str
    estrategia_codigo: str
    docente_id: int
    docente_nombre: str
    tutor_id: int
    tutor_nombre: str
    anio: int
    mes: int
    modalidad: str
    participantes_grupo: Optional[str] = None
    descripcion: str
    seguimientos_count: int
    seguimientos: List[SeguimientoOut] = []
    created_at: datetime


class AuditoriaOut(BaseModel):
    id: int
    usuario_email: str
    rol: str
    accion: str
    entidad_afectada: str
    entidad_id: Optional[str] = None
    detalle: str
    permitido: bool
    created_at: datetime

    class Config:
        from_attributes = True
