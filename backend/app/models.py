from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False, index=True)
    region = Column(String(100), nullable=False, default="Nacional")
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Entidad(Base):
    __tablename__ = "entidades"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False, index=True)
    tipo = Column(String(80), nullable=False)
    departamento = Column(String(100), nullable=False, index=True)
    municipio = Column(String(100), nullable=False)

    estrategias = relationship("Estrategia", back_populates="entidad")
    estudiantes = relationship("Estudiante", back_populates="entidad")
    docentes = relationship("Docente", back_populates="entidad")


class Estudiante(Base):
    __tablename__ = "estudiantes"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String(40), unique=True, nullable=False, index=True)
    nombre_completo = Column(String(180), nullable=False, index=True)
    grado = Column(String(40), nullable=False)
    email = Column(String(150), nullable=False)
    entidad_id = Column(Integer, ForeignKey("entidades.id"), nullable=False, index=True)

    entidad = relationship("Entidad", back_populates="estudiantes")
    vinculaciones = relationship("VinculacionEstudiante", back_populates="estudiante")


class Docente(Base):
    __tablename__ = "docentes"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String(40), unique=True, nullable=False, index=True)
    nombre_completo = Column(String(180), nullable=False, index=True)
    area = Column(String(120), nullable=False)
    email = Column(String(150), nullable=False)
    entidad_id = Column(Integer, ForeignKey("entidades.id"), nullable=False, index=True)

    entidad = relationship("Entidad", back_populates="docentes")
    estrategias_asociadas = relationship("DocenteEstrategia", back_populates="docente")
    acompanamientos = relationship("Acompanamiento", back_populates="docente")


class Estrategia(Base):
    __tablename__ = "estrategias"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False, index=True)
    descripcion = Column(Text, nullable=False)
    linea_tematica = Column(String(120), nullable=False)
    periodo = Column(String(40), nullable=False, default="2026-2")
    estado = Column(String(30), nullable=False, default="ACTIVA")
    entidad_id = Column(Integer, ForeignKey("entidades.id"), nullable=False, index=True)
    creador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entidad = relationship("Entidad", back_populates="estrategias")
    vinculaciones = relationship(
        "VinculacionEstudiante", back_populates="estrategia", cascade="all, delete-orphan"
    )
    docentes_asociados = relationship(
        "DocenteEstrategia", back_populates="estrategia", cascade="all, delete-orphan"
    )
    acompanamientos = relationship("Acompanamiento", back_populates="estrategia")


class VinculacionEstudiante(Base):
    __tablename__ = "vinculaciones_estudiantes"
    __table_args__ = (
        UniqueConstraint("estrategia_id", "estudiante_id", name="uq_estrategia_estudiante"),
        Index("ix_vinculacion_estrategia", "estrategia_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    estrategia_id = Column(Integer, ForeignKey("estrategias.id"), nullable=False)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), nullable=False)
    vinculado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    estrategia = relationship("Estrategia", back_populates="vinculaciones")
    estudiante = relationship("Estudiante", back_populates="vinculaciones")


class DocenteEstrategia(Base):
    __tablename__ = "docentes_estrategias"
    __table_args__ = (
        UniqueConstraint("estrategia_id", "docente_id", name="uq_docente_estrategia"),
    )

    id = Column(Integer, primary_key=True, index=True)
    estrategia_id = Column(Integer, ForeignKey("estrategias.id"), nullable=False)
    docente_id = Column(Integer, ForeignKey("docentes.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    estrategia = relationship("Estrategia", back_populates="docentes_asociados")
    docente = relationship("Docente", back_populates="estrategias_asociadas")


class Acompanamiento(Base):
    __tablename__ = "acompanamientos"

    id = Column(Integer, primary_key=True, index=True)
    estrategia_id = Column(Integer, ForeignKey("estrategias.id"), nullable=False, index=True)
    docente_id = Column(Integer, ForeignKey("docentes.id"), nullable=False, index=True)
    tutor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    anio = Column(Integer, nullable=False, index=True)
    mes = Column(Integer, nullable=False, index=True)
    modalidad = Column(String(20), nullable=False)  # INDIVIDUAL | GRUPAL
    participantes_grupo = Column(String(300), nullable=True)
    descripcion = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    estrategia = relationship("Estrategia", back_populates="acompanamientos")
    docente = relationship("Docente", back_populates="acompanamientos")
    tutor = relationship("Usuario")
    seguimientos = relationship(
        "SeguimientoSemanal", back_populates="acompanamiento", cascade="all, delete-orphan"
    )


class SeguimientoSemanal(Base):
    __tablename__ = "seguimientos_semanales"

    id = Column(Integer, primary_key=True, index=True)
    acompanamiento_id = Column(Integer, ForeignKey("acompanamientos.id"), nullable=False, index=True)
    semana = Column(Integer, nullable=False)  # 1..5
    fecha = Column(Date, nullable=False, default=date.today)
    observaciones = Column(Text, nullable=False)
    avance_porcentaje = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    acompanamiento = relationship("Acompanamiento", back_populates="seguimientos")


class EventoAuditoria(Base):
    __tablename__ = "eventos_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuario_email = Column(String(150), nullable=False)
    rol = Column(String(50), nullable=False)
    accion = Column(String(80), nullable=False, index=True)
    entidad_afectada = Column(String(80), nullable=False)
    entidad_id = Column(String(60), nullable=True)
    detalle = Column(Text, nullable=False)
    permitido = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
