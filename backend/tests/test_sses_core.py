import os
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_sses.db"

from app.main import app  # noqa: E402
from seed import run_seed  # noqa: E402

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    run_seed(num_estudiantes=30, reset=True)
    yield
    if os.path.exists("test_sses.db"):
        os.remove("test_sses.db")


def get_token(rol: str) -> str:
    res = client.post("/api/auth/demo-login", json={"rol": rol})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_cp001_to_cp005_estrategia_y_bloqueo_edicion():
    token_resp = get_token("RESPONSABLE_ESTRATEGIAS")
    headers = {"Authorization": f"Bearer {token_resp}"}

    # CP_002: entidad inexistente -> 400
    bad = client.post(
        "/api/estrategias",
        json={
            "codigo": "EST-TEST-99",
            "nombre": "Estrategia Inválida",
            "descripcion": "Entidad inexistente",
            "linea_tematica": "STEM y Tecnología",
            "periodo": "2026-2",
            "entidad_id": 9999,
        },
        headers=headers,
    )
    assert bad.status_code == 400

    # CP_001: crear estrategia válida
    created = client.post(
        "/api/estrategias",
        json={
            "codigo": "EST-TEST-01",
            "nombre": "Estrategia Prueba Integridad",
            "descripcion": "Descripción inicial editable",
            "linea_tematica": "STEM y Tecnología",
            "periodo": "2026-2",
            "entidad_id": 1,
            "docentes_ids": [1],
        },
        headers=headers,
    )
    assert created.status_code == 201
    est_id = created.json()["id"]
    assert created.json()["bloqueada_edicion"] is False

    # CP_003: editar sin estudiantes -> 200
    edited = client.put(
        f"/api/estrategias/{est_id}",
        json={"nombre": "Estrategia Prueba Editada"},
        headers=headers,
    )
    assert edited.status_code == 200
    assert edited.json()["nombre"] == "Estrategia Prueba Editada"

    # CP_005: vincular estudiante y rechazar duplicado
    link1 = client.post(
        f"/api/estrategias/{est_id}/vincular-estudiantes",
        json={"estudiantes_ids": [1]},
        headers=headers,
    )
    assert link1.status_code == 200
    assert link1.json()["bloqueada_edicion"] is True

    link_dup = client.post(
        f"/api/estrategias/{est_id}/vincular-estudiantes",
        json={"estudiantes_ids": [1]},
        headers=headers,
    )
    assert link_dup.status_code == 409

    # CP_004: intentar editar con estudiante vinculado -> 409 Conflict
    blocked = client.put(
        f"/api/estrategias/{est_id}",
        json={"descripcion": "No debe permitir cambio"},
        headers=headers,
    )
    assert blocked.status_code == 409


def test_cp006_to_cp010_acompanamiento_y_seguimiento():
    token_tutor = get_token("TUTOR")
    headers = {"Authorization": f"Bearer {token_tutor}"}

    # CP_007: docente no asociado a estrategia 14 -> 400
    docentes_est1 = client.get("/api/estrategias/1", headers=headers).json()["docentes"]
    doc_asociado_id = docentes_est1[0]["id"]

    acomp = client.post(
        "/api/acompanamientos",
        json={
            "estrategia_id": 1,
            "docente_id": doc_asociado_id,
            "anio": 2026,
            "mes": 11,
            "modalidad": "GRUPAL",
            "participantes_grupo": "Docentes de tecnología",
            "descripcion": "Sesión mensual de acompañamiento grupal.",
        },
        headers=headers,
    )
    assert acomp.status_code == 201
    acomp_id = acomp.json()["id"]

    # CP_010: fecha fuera del mes del acompañamiento -> 400
    seg_bad = client.post(
        f"/api/acompanamientos/{acomp_id}/seguimientos",
        json={
            "semana": 1,
            "fecha": "2026-10-05",
            "observaciones": "Mes incorrecto",
            "avance_porcentaje": 20,
        },
        headers=headers,
    )
    assert seg_bad.status_code == 400

    # CP_009: seguimiento válido -> 201
    seg_ok = client.post(
        f"/api/acompanamientos/{acomp_id}/seguimientos",
        json={
            "semana": 1,
            "fecha": "2026-11-05",
            "observaciones": "Seguimiento semana 1 exitoso.",
            "avance_porcentaje": 30,
        },
        headers=headers,
    )
    assert seg_ok.status_code == 201


def test_cp012_rbac_ente_control_y_auditoria():
    token_tutor = get_token("TUTOR")
    res_forbidden = client.get(
        "/api/reportes/desempeno-tutores",
        headers={"Authorization": f"Bearer {token_tutor}"},
    )
    assert res_forbidden.status_code == 403

    token_control = get_token("ENTE_CONTROL")
    res_ok = client.get(
        "/api/reportes/desempeno-tutores",
        headers={"Authorization": f"Bearer {token_control}"},
    )
    assert res_ok.status_code == 200

    audit = client.get(
        "/api/reportes/auditoria",
        headers={"Authorization": f"Bearer {token_control}"},
    )
    assert audit.status_code == 200
    acciones = [e["accion"] for e in audit.json()]
    assert "CONSULTA_REPORTE_CONTROL" in acciones
