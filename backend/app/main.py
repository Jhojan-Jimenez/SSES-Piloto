import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .database import Base, engine, SessionLocal
from .models import Usuario
from .routers import (
    auth_router,
    catalogos_router,
    estrategias_router,
    acompanamientos_router,
    reportes_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Usuario).count() == 0:
            from seed import run_seed
            run_seed(num_estudiantes=200, reset=False)
    finally:
        db.close()
    yield


app = FastAPI(
    title="SSES Piloto API — Ministerio de Educación Nacional",
    description="API de negocio para el Sistema de Seguimiento de Actividades Extracurriculares (SSES).",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(catalogos_router.router)
app.include_router(estrategias_router.router)
app.include_router(acompanamientos_router.router)
app.include_router(reportes_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "sses-piloto-api"}


STATIC_DIR = os.getenv("STATIC_DIR", "")
if STATIC_DIR and os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
