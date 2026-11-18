from sqlalchemy.orm import Session
from .models import EventoAuditoria, Usuario


def log_audit(
    db: Session,
    user: Usuario | None,
    accion: str,
    entidad_afectada: str,
    entidad_id: str | int | None,
    detalle: str,
    permitido: bool = True,
    email_override: str | None = None,
    rol_override: str | None = None,
):
    evento = EventoAuditoria(
        usuario_id=user.id if user else None,
        usuario_email=user.email if user else (email_override or "anonimo"),
        rol=user.rol if user else (rol_override or "ANONIMO"),
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=str(entidad_id) if entidad_id is not None else None,
        detalle=detalle,
        permitido=permitido,
    )
    db.add(evento)
    db.commit()
