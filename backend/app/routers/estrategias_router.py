from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import (
    Estrategia,
    Entidad,
    Estudiante,
    Docente,
    VinculacionEstudiante,
    DocenteEstrategia,
    Usuario,
)
from ..schemas import (
    EstrategiaCreate,
    EstrategiaUpdate,
    EstrategiaOut,
    EstrategiaDetailOut,
    EstudianteOut,
    DocenteOut,
    VincularEstudiantesRequest,
    AsociarDocentesRequest,
)
from ..auth import get_current_user, require_roles
from ..audit import log_audit

router = APIRouter(prefix="/api/estrategias", tags=["Estrategias Estudiantiles"])


def _to_estrategia_out(
    e: Estrategia, est_count: int, doc_count: int
) -> EstrategiaOut:
    return EstrategiaOut(
        id=e.id,
        codigo=e.codigo,
        nombre=e.nombre,
        descripcion=e.descripcion,
        linea_tematica=e.linea_tematica,
        periodo=e.periodo,
        estado=e.estado,
        entidad_id=e.entidad_id,
        entidad_nombre=e.entidad.nombre if e.entidad else "",
        estudiantes_vinculados_count=est_count,
        docentes_asociados_count=doc_count,
        bloqueada_edicion=est_count > 0,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


@router.get("", response_model=list[EstrategiaOut])
def list_estrategias(
    q: Optional[str] = Query(None),
    entidad_id: Optional[int] = Query(None),
    bloqueada: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = db.query(Estrategia).options(joinedload(Estrategia.entidad))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Estrategia.nombre.ilike(like))
            | (Estrategia.codigo.ilike(like))
            | (Estrategia.linea_tematica.ilike(like))
        )
    if entidad_id:
        query = query.filter(Estrategia.entidad_id == entidad_id)

    estrategias = query.order_by(Estrategia.id.desc()).all()

    est_counts = dict(
        db.query(
            VinculacionEstudiante.estrategia_id, func.count(VinculacionEstudiante.id)
        )
        .group_by(VinculacionEstudiante.estrategia_id)
        .all()
    )
    doc_counts = dict(
        db.query(DocenteEstrategia.estrategia_id, func.count(DocenteEstrategia.id))
        .group_by(DocenteEstrategia.estrategia_id)
        .all()
    )

    items = []
    for e in estrategias:
        ec = est_counts.get(e.id, 0)
        dc = doc_counts.get(e.id, 0)
        if bloqueada is not None and (ec > 0) != bloqueada:
            continue
        items.append(_to_estrategia_out(e, ec, dc))
    return items


@router.get("/{estrategia_id}", response_model=EstrategiaDetailOut)
def get_estrategia(
    estrategia_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    estrategia = (
        db.query(Estrategia)
        .options(
            joinedload(Estrategia.entidad),
            joinedload(Estrategia.vinculaciones).joinedload(VinculacionEstudiante.estudiante).joinedload(Estudiante.entidad),
            joinedload(Estrategia.docentes_asociados).joinedload(DocenteEstrategia.docente).joinedload(Docente.entidad),
        )
        .filter(Estrategia.id == estrategia_id)
        .first()
    )
    if not estrategia:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")

    estudiantes = [
        EstudianteOut(
            id=v.estudiante.id,
            documento=v.estudiante.documento,
            nombre_completo=v.estudiante.nombre_completo,
            grado=v.estudiante.grado,
            email=v.estudiante.email,
            entidad_id=v.estudiante.entidad_id,
            entidad_nombre=v.estudiante.entidad.nombre if v.estudiante.entidad else None,
        )
        for v in estrategia.vinculaciones
    ]
    docentes = [
        DocenteOut(
            id=de.docente.id,
            documento=de.docente.documento,
            nombre_completo=de.docente.nombre_completo,
            area=de.docente.area,
            email=de.docente.email,
            entidad_id=de.docente.entidad_id,
            entidad_nombre=de.docente.entidad.nombre if de.docente.entidad else None,
            estrategias_ids=[estrategia.id],
        )
        for de in estrategia.docentes_asociados
    ]
    base = _to_estrategia_out(estrategia, len(estudiantes), len(docentes))
    return EstrategiaDetailOut(
        **base.model_dump(),
        estudiantes=estudiantes,
        docentes=docentes,
    )


@router.post("", response_model=EstrategiaOut, status_code=status.HTTP_201_CREATED)
def create_estrategia(
    payload: EstrategiaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["RESPONSABLE_ESTRATEGIAS"])),
):
    entidad = db.query(Entidad).filter(Entidad.id == payload.entidad_id).first()
    if not entidad:
        raise HTTPException(
            status_code=400,
            detail=f"La entidad {payload.entidad_id} no existe en el catálogo precargado.",
        )

    existing = db.query(Estrategia).filter(Estrategia.codigo == payload.codigo.strip()).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe una estrategia con el código {payload.codigo}.",
        )

    estrategia = Estrategia(
        codigo=payload.codigo.strip().upper(),
        nombre=payload.nombre.strip(),
        descripcion=payload.descripcion.strip(),
        linea_tematica=payload.linea_tematica.strip(),
        periodo=payload.periodo.strip(),
        estado="ACTIVA",
        entidad_id=entidad.id,
        creador_id=current_user.id,
    )
    db.add(estrategia)
    db.flush()

    doc_count = 0
    if payload.docentes_ids:
        docentes = db.query(Docente).filter(Docente.id.in_(payload.docentes_ids)).all()
        if len(docentes) != len(set(payload.docentes_ids)):
            db.rollback()
            raise HTTPException(status_code=400, detail="Uno o más docentes no existen.")
        for d_id in set(payload.docentes_ids):
            db.add(DocenteEstrategia(estrategia_id=estrategia.id, docente_id=d_id))
            doc_count += 1

    db.commit()
    db.refresh(estrategia)
    log_audit(
        db,
        current_user,
        "CREAR_ESTRATEGIA",
        "Estrategia",
        estrategia.id,
        f"Estrategia '{estrategia.codigo} - {estrategia.nombre}' creada en entidad '{entidad.nombre}'.",
    )
    return _to_estrategia_out(estrategia, 0, doc_count)


@router.put("/{estrategia_id}", response_model=EstrategiaOut)
def update_estrategia(
    estrategia_id: int,
    payload: EstrategiaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["RESPONSABLE_ESTRATEGIAS"])),
):
    # Regla crítica RQF_005 / RQNF_007: verificación transaccional antes de guardar
    estrategia = (
        db.query(Estrategia)
        .options(joinedload(Estrategia.entidad))
        .filter(Estrategia.id == estrategia_id)
        .first()
    )
    if not estrategia:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")

    vinculados_count = (
        db.query(func.count(VinculacionEstudiante.id))
        .filter(VinculacionEstudiante.estrategia_id == estrategia_id)
        .scalar()
        or 0
    )
    if vinculados_count > 0:
        log_audit(
            db,
            current_user,
            "EDICION_BLOQUEADA",
            "Estrategia",
            estrategia.id,
            f"Intento de edición rechazado: la estrategia '{estrategia.codigo}' tiene {vinculados_count} estudiante(s) vinculado(s).",
            permitido=False,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Regla de integridad: la estrategia '{estrategia.codigo}' tiene {vinculados_count} estudiante(s) vinculado(s) y su edición está bloqueada.",
        )

    if payload.entidad_id is not None:
        entidad = db.query(Entidad).filter(Entidad.id == payload.entidad_id).first()
        if not entidad:
            raise HTTPException(status_code=400, detail="Entidad destino no existe.")
        estrategia.entidad_id = payload.entidad_id

    if payload.nombre is not None:
        estrategia.nombre = payload.nombre.strip()
    if payload.descripcion is not None:
        estrategia.descripcion = payload.descripcion.strip()
    if payload.linea_tematica is not None:
        estrategia.linea_tematica = payload.linea_tematica.strip()
    if payload.periodo is not None:
        estrategia.periodo = payload.periodo.strip()
    if payload.estado is not None:
        estrategia.estado = payload.estado

    estrategia.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(estrategia)

    doc_count = (
        db.query(func.count(DocenteEstrategia.id))
        .filter(DocenteEstrategia.estrategia_id == estrategia_id)
        .scalar()
        or 0
    )
    log_audit(
        db,
        current_user,
        "EDITAR_ESTRATEGIA",
        "Estrategia",
        estrategia.id,
        f"Estrategia '{estrategia.codigo}' actualizada (0 estudiantes vinculados).",
    )
    return _to_estrategia_out(estrategia, 0, doc_count)


@router.post("/{estrategia_id}/vincular-estudiantes")
def vincular_estudiantes(
    estrategia_id: int,
    payload: VincularEstudiantesRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["RESPONSABLE_ESTRATEGIAS"])),
):
    estrategia = db.query(Estrategia).filter(Estrategia.id == estrategia_id).first()
    if not estrategia:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")

    unique_ids = list(dict.fromkeys(payload.estudiantes_ids))
    estudiantes = db.query(Estudiante).filter(Estudiante.id.in_(unique_ids)).all()
    if len(estudiantes) != len(unique_ids):
        raise HTTPException(
            status_code=400,
            detail="Uno o más estudiantes indicados no existen en el catálogo precargado.",
        )

    existing_links = {
        v.estudiante_id
        for v in db.query(VinculacionEstudiante)
        .filter(
            VinculacionEstudiante.estrategia_id == estrategia_id,
            VinculacionEstudiante.estudiante_id.in_(unique_ids),
        )
        .all()
    }

    if existing_links and len(existing_links) == len(unique_ids):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los estudiantes seleccionados ya se encuentran vinculados a esta estrategia (vínculo duplicado rechazado).",
        )

    nuevos = 0
    for est_id in unique_ids:
        if est_id in existing_links:
            continue
        db.add(
            VinculacionEstudiante(
                estrategia_id=estrategia_id,
                estudiante_id=est_id,
                vinculado_por_id=current_user.id,
            )
        )
        nuevos += 1

    db.commit()
    total_vinculados = (
        db.query(func.count(VinculacionEstudiante.id))
        .filter(VinculacionEstudiante.estrategia_id == estrategia_id)
        .scalar()
        or 0
    )
    log_audit(
        db,
        current_user,
        "VINCULAR_ESTUDIANTES",
        "Estrategia",
        estrategia.id,
        f"Vinculados {nuevos} estudiante(s) a '{estrategia.codigo}'. Total vinculados: {total_vinculados}. Edición bloqueada.",
    )
    return {
        "estrategia_id": estrategia_id,
        "vinculados_nuevos": nuevos,
        "omitidos_duplicados": len(existing_links),
        "total_vinculados": total_vinculados,
        "bloqueada_edicion": total_vinculados > 0,
    }


@router.post("/{estrategia_id}/asociar-docentes")
def asociar_docentes(
    estrategia_id: int,
    payload: AsociarDocentesRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["RESPONSABLE_ESTRATEGIAS"])),
):
    estrategia = db.query(Estrategia).filter(Estrategia.id == estrategia_id).first()
    if not estrategia:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")

    unique_ids = list(dict.fromkeys(payload.docentes_ids))
    docentes = db.query(Docente).filter(Docente.id.in_(unique_ids)).all()
    if len(docentes) != len(unique_ids):
        raise HTTPException(status_code=400, detail="Uno o más docentes no existen.")

    existing = {
        de.docente_id
        for de in db.query(DocenteEstrategia)
        .filter(
            DocenteEstrategia.estrategia_id == estrategia_id,
            DocenteEstrategia.docente_id.in_(unique_ids),
        )
        .all()
    }
    nuevos = 0
    for d_id in unique_ids:
        if d_id in existing:
            continue
        db.add(DocenteEstrategia(estrategia_id=estrategia_id, docente_id=d_id))
        nuevos += 1

    db.commit()
    log_audit(
        db,
        current_user,
        "ASOCIAR_DOCENTES",
        "Estrategia",
        estrategia.id,
        f"Asociados {nuevos} docente(s) a la estrategia '{estrategia.codigo}'.",
    )
    return {"estrategia_id": estrategia_id, "asociados_nuevos": nuevos}
