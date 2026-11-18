from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import (
    Acompanamiento,
    SeguimientoSemanal,
    DocenteEstrategia,
    Estrategia,
    Docente,
    Usuario,
)
from ..schemas import (
    AcompanamientoCreate,
    AcompanamientoOut,
    SeguimientoCreate,
    SeguimientoOut,
)
from ..auth import get_current_user, require_roles
from ..audit import log_audit

router = APIRouter(prefix="/api/acompanamientos", tags=["Acompañamientos Pedagógicos"])


def _to_acomp_out(a: Acompanamiento) -> AcompanamientoOut:
    segs = sorted(a.seguimientos, key=lambda s: (s.semana, s.fecha))
    return AcompanamientoOut(
        id=a.id,
        estrategia_id=a.estrategia_id,
        estrategia_nombre=a.estrategia.nombre if a.estrategia else "",
        estrategia_codigo=a.estrategia.codigo if a.estrategia else "",
        docente_id=a.docente_id,
        docente_nombre=a.docente.nombre_completo if a.docente else "",
        tutor_id=a.tutor_id,
        tutor_nombre=a.tutor.nombre if a.tutor else "",
        anio=a.anio,
        mes=a.mes,
        modalidad=a.modalidad,
        participantes_grupo=a.participantes_grupo,
        descripcion=a.descripcion,
        seguimientos_count=len(segs),
        seguimientos=[SeguimientoOut.model_validate(s) for s in segs],
        created_at=a.created_at,
    )


@router.get("", response_model=list[AcompanamientoOut])
def list_acompanamientos(
    estrategia_id: Optional[int] = Query(None),
    docente_id: Optional[int] = Query(None),
    tutor_id: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    modalidad: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = db.query(Acompanamiento).options(
        joinedload(Acompanamiento.estrategia),
        joinedload(Acompanamiento.docente),
        joinedload(Acompanamiento.tutor),
        joinedload(Acompanamiento.seguimientos),
    )
    if estrategia_id:
        query = query.filter(Acompanamiento.estrategia_id == estrategia_id)
    if docente_id:
        query = query.filter(Acompanamiento.docente_id == docente_id)
    if tutor_id:
        query = query.filter(Acompanamiento.tutor_id == tutor_id)
    if anio:
        query = query.filter(Acompanamiento.anio == anio)
    if mes:
        query = query.filter(Acompanamiento.mes == mes)
    if modalidad:
        query = query.filter(Acompanamiento.modalidad == modalidad)

    items = query.order_by(Acompanamiento.anio.desc(), Acompanamiento.mes.desc(), Acompanamiento.id.desc()).all()
    return [_to_acomp_out(a) for a in items]


@router.post("", response_model=AcompanamientoOut, status_code=status.HTTP_201_CREATED)
def create_acompanamiento(
    payload: AcompanamientoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["TUTOR"])),
):
    estrategia = db.query(Estrategia).filter(Estrategia.id == payload.estrategia_id).first()
    if not estrategia:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")

    docente = db.query(Docente).filter(Docente.id == payload.docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado.")

    # Regla RQF_012 / CP_007: el docente debe estar previamente asociado a la estrategia
    asociado = (
        db.query(DocenteEstrategia)
        .filter(
            DocenteEstrategia.estrategia_id == payload.estrategia_id,
            DocenteEstrategia.docente_id == payload.docente_id,
        )
        .first()
    )
    if not asociado:
        raise HTTPException(
            status_code=400,
            detail=f"El docente '{docente.nombre_completo}' no está asociado a la estrategia '{estrategia.codigo}'.",
        )

    if payload.modalidad == "GRUPAL" and not (payload.participantes_grupo and payload.participantes_grupo.strip()):
        raise HTTPException(
            status_code=400,
            detail="Para modalidad GRUPAL debe indicar los participantes o grupo atendido.",
        )

    acomp = Acompanamiento(
        estrategia_id=payload.estrategia_id,
        docente_id=payload.docente_id,
        tutor_id=current_user.id,
        anio=payload.anio,
        mes=payload.mes,
        modalidad=payload.modalidad,
        participantes_grupo=payload.participantes_grupo.strip() if payload.participantes_grupo else None,
        descripcion=payload.descripcion.strip(),
    )
    db.add(acomp)
    db.commit()
    db.refresh(acomp)

    acomp_full = (
        db.query(Acompanamiento)
        .options(
            joinedload(Acompanamiento.estrategia),
            joinedload(Acompanamiento.docente),
            joinedload(Acompanamiento.tutor),
            joinedload(Acompanamiento.seguimientos),
        )
        .filter(Acompanamiento.id == acomp.id)
        .first()
    )
    log_audit(
        db,
        current_user,
        "CREAR_ACOMPANAMIENTO",
        "Acompanamiento",
        acomp.id,
        f"Acompañamiento {payload.modalidad} registrado para docente '{docente.nombre_completo}' en {payload.anio}-{payload.mes:02d}.",
    )
    return _to_acomp_out(acomp_full)


@router.post("/{acompanamiento_id}/seguimientos", response_model=SeguimientoOut, status_code=status.HTTP_201_CREATED)
def add_seguimiento_semanal(
    acompanamiento_id: int,
    payload: SeguimientoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["TUTOR"])),
):
    acomp = db.query(Acompanamiento).filter(Acompanamiento.id == acompanamiento_id).first()
    if not acomp:
        raise HTTPException(status_code=404, detail="Acompañamiento mensual no encontrado.")

    # Regla CP_010: la fecha debe corresponder al mes y año del acompañamiento
    if payload.fecha.year != acomp.anio or payload.fecha.month != acomp.mes:
        raise HTTPException(
            status_code=400,
            detail=f"La fecha del seguimiento ({payload.fecha}) no corresponde al periodo mensual del acompañamiento ({acomp.anio}-{acomp.mes:02d}).",
        )

    seg = SeguimientoSemanal(
        acompanamiento_id=acompanamiento_id,
        semana=payload.semana,
        fecha=payload.fecha,
        observaciones=payload.observaciones.strip(),
        avance_porcentaje=payload.avance_porcentaje,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)

    log_audit(
        db,
        current_user,
        "CREAR_SEGUIMIENTO_SEMANAL",
        "SeguimientoSemanal",
        seg.id,
        f"Seguimiento semana {payload.semana} agregado al acompañamiento #{acompanamiento_id}.",
    )
    return SeguimientoOut.model_validate(seg)
