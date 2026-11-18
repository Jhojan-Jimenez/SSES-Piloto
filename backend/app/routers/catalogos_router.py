from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import Entidad, Estudiante, Docente, Usuario
from ..schemas import EntidadOut, EstudianteOut, DocenteOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/catalogos", tags=["Catálogos Precargados"])


@router.get("/entidades", response_model=list[EntidadOut])
def list_entidades(
    q: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = db.query(Entidad)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Entidad.nombre.ilike(like))
            | (Entidad.codigo.ilike(like))
            | (Entidad.municipio.ilike(like))
        )
    if departamento:
        query = query.filter(Entidad.departamento == departamento)
    return query.order_by(Entidad.nombre.asc()).all()


@router.get("/estudiantes")
def list_estudiantes(
    q: Optional[str] = Query(None),
    entidad_id: Optional[int] = Query(None),
    grado: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=250),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = db.query(Estudiante).options(joinedload(Estudiante.entidad))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Estudiante.nombre_completo.ilike(like))
            | (Estudiante.documento.ilike(like))
            | (Estudiante.email.ilike(like))
        )
    if entidad_id:
        query = query.filter(Estudiante.entidad_id == entidad_id)
    if grado:
        query = query.filter(Estudiante.grado == grado)

    total = query.count()
    items = (
        query.order_by(Estudiante.nombre_completo.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            EstudianteOut(
                id=e.id,
                documento=e.documento,
                nombre_completo=e.nombre_completo,
                grado=e.grado,
                email=e.email,
                entidad_id=e.entidad_id,
                entidad_nombre=e.entidad.nombre if e.entidad else None,
            )
            for e in items
        ],
    }


@router.get("/docentes", response_model=list[DocenteOut])
def list_docentes(
    q: Optional[str] = Query(None),
    entidad_id: Optional[int] = Query(None),
    estrategia_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = db.query(Docente).options(
        joinedload(Docente.entidad),
        joinedload(Docente.estrategias_asociadas),
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (Docente.nombre_completo.ilike(like))
            | (Docente.documento.ilike(like))
            | (Docente.area.ilike(like))
        )
    if entidad_id:
        query = query.filter(Docente.entidad_id == entidad_id)

    docentes = query.order_by(Docente.nombre_completo.asc()).all()
    result = []
    for d in docentes:
        est_ids = [de.estrategia_id for de in d.estrategias_asociadas]
        if estrategia_id is not None and estrategia_id not in est_ids:
            continue
        result.append(
            DocenteOut(
                id=d.id,
                documento=d.documento,
                nombre_completo=d.nombre_completo,
                area=d.area,
                email=d.email,
                entidad_id=d.entidad_id,
                entidad_nombre=d.entidad.nombre if d.entidad else None,
                estrategias_ids=est_ids,
            )
        )
    return result
