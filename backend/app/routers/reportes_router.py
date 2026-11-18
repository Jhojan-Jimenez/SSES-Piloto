import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import (
    Entidad,
    Estudiante,
    Docente,
    Estrategia,
    VinculacionEstudiante,
    Acompanamiento,
    SeguimientoSemanal,
    EventoAuditoria,
    Usuario,
)
from ..schemas import AuditoriaOut
from ..auth import get_current_user, require_roles
from ..audit import log_audit

router = APIRouter(prefix="/api/reportes", tags=["Reportes y Auditoría"])


@router.get("/resumen")
def get_resumen(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    total_entidades = db.query(func.count(Entidad.id)).scalar() or 0
    total_estudiantes = db.query(func.count(Estudiante.id)).scalar() or 0
    total_docentes = db.query(func.count(Docente.id)).scalar() or 0
    total_estrategias = db.query(func.count(Estrategia.id)).scalar() or 0
    total_vinculaciones = db.query(func.count(VinculacionEstudiante.id)).scalar() or 0
    estrategias_bloqueadas = (
        db.query(func.count(func.distinct(VinculacionEstudiante.estrategia_id))).scalar() or 0
    )
    total_acompanamientos = db.query(func.count(Acompanamiento.id)).scalar() or 0
    total_seguimientos = db.query(func.count(SeguimientoSemanal.id)).scalar() or 0

    por_modalidad = dict(
        db.query(Acompanamiento.modalidad, func.count(Acompanamiento.id))
        .group_by(Acompanamiento.modalidad)
        .all()
    )

    por_linea = [
        {"linea": row[0], "cantidad": row[1]}
        for row in db.query(Estrategia.linea_tematica, func.count(Estrategia.id))
        .group_by(Estrategia.linea_tematica)
        .order_by(func.count(Estrategia.id).desc())
        .all()
    ]

    return {
        "total_entidades": total_entidades,
        "total_estudiantes": total_estudiantes,
        "total_docentes": total_docentes,
        "total_estrategias": total_estrategias,
        "estrategias_bloqueadas": estrategias_bloqueadas,
        "estrategias_editables": total_estrategias - estrategias_bloqueadas,
        "total_vinculaciones": total_vinculaciones,
        "total_acompanamientos": total_acompanamientos,
        "total_seguimientos": total_seguimientos,
        "acompanamientos_individuales": por_modalidad.get("INDIVIDUAL", 0),
        "acompanamientos_grupales": por_modalidad.get("GRUPAL", 0),
        "estrategias_por_linea": por_linea,
    }


@router.get("/desempeno-tutores")
def get_desempeno_tutores(
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    modalidad: Optional[str] = Query(None),
    tutor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(
        require_roles(["ANALISTA_MINISTERIO", "ENTE_CONTROL"])
    ),
):
    query = db.query(Acompanamiento).options(
        joinedload(Acompanamiento.estrategia).joinedload(Estrategia.entidad),
        joinedload(Acompanamiento.docente),
        joinedload(Acompanamiento.tutor),
        joinedload(Acompanamiento.seguimientos),
    )
    if anio:
        query = query.filter(Acompanamiento.anio == anio)
    if mes:
        query = query.filter(Acompanamiento.mes == mes)
    if modalidad:
        query = query.filter(Acompanamiento.modalidad == modalidad)
    if tutor_id:
        query = query.filter(Acompanamiento.tutor_id == tutor_id)

    acomps = query.order_by(Acompanamiento.anio.desc(), Acompanamiento.mes.desc()).all()

    tutores_map: dict[int, dict] = {}
    actividades = []
    for a in acomps:
        tid = a.tutor_id
        if tid not in tutores_map:
            tutores_map[tid] = {
                "tutor_id": tid,
                "tutor_nombre": a.tutor.nombre if a.tutor else "Tutor",
                "tutor_region": a.tutor.region if a.tutor else "Nacional",
                "total_acompanamientos": 0,
                "individuales": 0,
                "grupales": 0,
                "total_seguimientos": 0,
                "avance_promedio": 0.0,
                "_avances": [],
            }
        entry = tutores_map[tid]
        entry["total_acompanamientos"] += 1
        if a.modalidad == "INDIVIDUAL":
            entry["individuales"] += 1
        else:
            entry["grupales"] += 1
        entry["total_seguimientos"] += len(a.seguimientos)
        for s in a.seguimientos:
            entry["_avances"].append(s.avance_porcentaje)

        ultimo_avance = (
            max((s.avance_porcentaje for s in a.seguimientos), default=0)
        )
        actividades.append(
            {
                "id": a.id,
                "periodo": f"{a.anio}-{a.mes:02d}",
                "estrategia_codigo": a.estrategia.codigo if a.estrategia else "",
                "estrategia_nombre": a.estrategia.nombre if a.estrategia else "",
                "entidad": a.estrategia.entidad.nombre if a.estrategia and a.estrategia.entidad else "",
                "docente": a.docente.nombre_completo if a.docente else "",
                "tutor": a.tutor.nombre if a.tutor else "",
                "modalidad": a.modalidad,
                "seguimientos_count": len(a.seguimientos),
                "ultimo_avance": ultimo_avance,
            }
        )

    resumen_tutores = []
    for entry in tutores_map.values():
        avances = entry.pop("_avances")
        entry["avance_promedio"] = round(sum(avances) / len(avances), 1) if avances else 0.0
        resumen_tutores.append(entry)

    if current_user.rol == "ENTE_CONTROL":
        log_audit(
            db,
            current_user,
            "CONSULTA_REPORTE_CONTROL",
            "Reporte",
            "desempeno-tutores",
            f"Consulta de reporte oficial por Ente de Control (filtros anio={anio}, mes={mes}, modalidad={modalidad}).",
        )

    return {
        "tutores": resumen_tutores,
        "actividades": actividades,
        "total_registros": len(actividades),
    }


@router.get("/exportar-csv")
def exportar_csv(
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    modalidad: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(
        require_roles(["ANALISTA_MINISTERIO", "ENTE_CONTROL"])
    ),
):
    query = db.query(Acompanamiento).options(
        joinedload(Acompanamiento.estrategia).joinedload(Estrategia.entidad),
        joinedload(Acompanamiento.docente),
        joinedload(Acompanamiento.tutor),
        joinedload(Acompanamiento.seguimientos),
    )
    if anio:
        query = query.filter(Acompanamiento.anio == anio)
    if mes:
        query = query.filter(Acompanamiento.mes == mes)
    if modalidad:
        query = query.filter(Acompanamiento.modalidad == modalidad)

    acomps = query.order_by(Acompanamiento.anio.desc(), Acompanamiento.mes.desc()).all()

    output = io.StringIO()
    output.write("\ufeff")  # BOM UTF-8
    writer = csv.writer(output, delimiter=";")
    writer.writerow(
        [
            "ID",
            "Periodo",
            "Codigo Estrategia",
            "Estrategia",
            "Entidad",
            "Departamento",
            "Docente",
            "Tutor",
            "Modalidad",
            "Seguimientos Semanales",
            "Ultimo Avance (%)",
            "Descripcion",
        ]
    )
    for a in acomps:
        ultimo_avance = max((s.avance_porcentaje for s in a.seguimientos), default=0)
        writer.writerow(
            [
                a.id,
                f"{a.anio}-{a.mes:02d}",
                a.estrategia.codigo if a.estrategia else "",
                a.estrategia.nombre if a.estrategia else "",
                a.estrategia.entidad.nombre if a.estrategia and a.estrategia.entidad else "",
                a.estrategia.entidad.departamento if a.estrategia and a.estrategia.entidad else "",
                a.docente.nombre_completo if a.docente else "",
                a.tutor.nombre if a.tutor else "",
                a.modalidad,
                len(a.seguimientos),
                ultimo_avance,
                a.descripcion.replace("\n", " "),
            ]
        )

    log_audit(
        db,
        current_user,
        "EXPORTAR_REPORTE_CSV",
        "Reporte",
        "exportar-csv",
        f"Exportación CSV generada ({len(acomps)} registros) por rol {current_user.rol}.",
    )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=sses_reporte_actividades.csv"},
    )


@router.get("/auditoria", response_model=list[AuditoriaOut])
def get_auditoria(
    limit: int = Query(100, ge=1, le=500),
    accion: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(["ANALISTA_MINISTERIO", "ENTE_CONTROL"])),
):
    query = db.query(EventoAuditoria)
    if accion:
        query = query.filter(EventoAuditoria.accion == accion)
    return query.order_by(EventoAuditoria.id.desc()).limit(limit).all()
