# SSES Piloto — MVP (Ministerio de Educación Nacional)

MVP de arquitectura web de 3 capas (**SPA React + API FastAPI + SQLite WAL**) para el Sistema de Seguimiento de Actividades Extracurriculares (SSES).

## Estructura

- `backend/` — API REST en FastAPI + SQLAlchemy + SQLite (`sses.db`) + JWT RBAC + `seed.py` (generador de volumen mock).
- `frontend/` — SPA en React 19 + TypeScript + Tailwind CSS (paleta Refero + barra lateral colapsable estilo Notion).

## Ejecución en Local

### 1. Backend (API + SQLite)
```bash
cd backend
.venv/bin/python seed.py --estudiantes 200
.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (SPA)
```bash
cd frontend
pnpm run dev
```

Abre `http://localhost:5173`.

## Pruebas Automatizadas (Backend)
```bash
cd backend
PYTHONPATH=. .venv/bin/pytest -v
```

## Roles Demo (Contraseña: `sses2026`)
- `responsable@mineducacion.gov.co` — Responsable de Estrategias (`CU_002`, `CU_003`, `CU_004`)
- `tutor@mineducacion.gov.co` — Tutor Pedagógico (`CU_006`, `CU_007`)
- `analista@mineducacion.gov.co` — Analista del Ministerio (`CU_008`)
- `control@contraloria.gov.co` — Ente de Control (`CU_009`)
