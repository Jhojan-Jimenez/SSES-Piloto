from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Usuario
from ..schemas import LoginRequest, DemoLoginRequest, TokenResponse, UserOut
from ..auth import verify_password, create_access_token, get_current_user
from ..audit import log_audit

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == payload.email.strip().lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        log_audit(
            db,
            None,
            "LOGIN_FALLIDO",
            "Usuario",
            payload.email,
            "Intento de inicio de sesión con credenciales inválidas.",
            permitido=False,
            email_override=payload.email,
            rol_override="DESCONOCIDO",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo.",
        )
    token = create_access_token(user)
    log_audit(db, user, "LOGIN_EXITOSO", "Usuario", user.id, f"Inicio de sesión con rol {user.rol}.")
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.rol == payload.rol, Usuario.activo == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe usuario demo activo para el rol {payload.rol}.",
        )
    token = create_access_token(user)
    log_audit(
        db,
        user,
        "CAMBIO_ROL_DEMO",
        "Usuario",
        user.id,
        f"Acceso rápido demo con perfil {user.rol}.",
    )
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/demo-users", response_model=list[UserOut])
def list_demo_users(db: Session = Depends(get_db)):
    users = db.query(Usuario).filter(Usuario.activo == True).order_by(Usuario.id.asc()).all()
    seen_roles = set()
    result = []
    for u in users:
        if u.rol not in seen_roles:
            seen_roles.add(u.rol)
            result.append(UserOut.model_validate(u))
    return result


@router.get("/me", response_model=UserOut)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
