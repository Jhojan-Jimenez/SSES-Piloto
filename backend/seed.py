import argparse
import random
from datetime import date, timedelta
from app.database import Base, engine, SessionLocal
from app.models import (
    Usuario,
    Entidad,
    Estudiante,
    Docente,
    Estrategia,
    VinculacionEstudiante,
    DocenteEstrategia,
    Acompanamiento,
    SeguimientoSemanal,
    EventoAuditoria,
)
from app.auth import hash_password

NOMBRES = [
    "Sofía", "Mateo", "Valentina", "Santiago", "Isabella", "Sebastián", "Camila",
    "Alejandro", "Luciana", "Daniel", "Mariana", "Nicolás", "Gabriela", "Samuel",
    "Valeria", "Juan José", "Paula", "Tomás", "Laura", "Andrés", "Sara", "Felipe",
    "Daniela", "Diego", "Natalia", "Miguel", "Juliana", "David", "Carolina", "Esteban",
]

APELLIDOS = [
    "Rodríguez", "Gómez", "Martínez", "López", "García", "Hernández", "González",
    "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Díaz", "Reyes",
    "Morales", "Castillo", "Vargas", "Rojas", "Mendoza", "Ortiz", "Silva", "Cruz",
    "Jiménez", "Moreno", "Muñoz", "Álvarez", "Romero", "Herrera", "Cárdenas",
]

ENTIDADES_DATA = [
    ("ENT-001", "I.E.D. Técnico Industrial Piloto", "Institución Educativa", "Bogotá D.C.", "Bogotá"),
    ("ENT-002", "I.E. INEM José Félix de Restrepo", "Institución Educativa", "Antioquia", "Medellín"),
    ("ENT-003", "I.E. Santa Librada", "Institución Educativa", "Valle del Cauca", "Cali"),
    ("ENT-004", "I.E.D. Alexander von Humboldt", "Institución Educativa", "Atlántico", "Barranquilla"),
    ("ENT-005", "I.E. Tecnológico Salesiano Eloy Valenzuela", "Institución Educativa", "Santander", "Bucaramanga"),
    ("ENT-006", "I.E. Soledad Acosta de Samper", "Institución Educativa", "Bolívar", "Cartagena"),
    ("ENT-007", "I.E. Municipal Ciudad de Pasto", "Institución Educativa", "Nariño", "Pasto"),
    ("ENT-008", "I.E. Silvino Rodríguez", "Institución Educativa", "Boyacá", "Tunja"),
    ("ENT-009", "I.E. Colegio Nacionalizado Femenino", "Institución Educativa", "Meta", "Villavicencio"),
    ("ENT-010", "I.E. Leónidas Rubio Villegas", "Institución Educativa", "Tolima", "Ibagué"),
    ("ENT-011", "I.E. Deogracias Cardona", "Institución Educativa", "Risaralda", "Pereira"),
    ("ENT-012", "Secretaría de Educación Territorial Piloto", "Secretaría de Educación", "Cundinamarca", "Chía"),
]

AREAS_DOCENTES = [
    "Matemáticas y Pensamiento Lógico",
    "Ciencias Naturales y Robótica",
    "Lenguaje y Comunicación",
    "Artes Plásticas y Cultura",
    "Educación Física y Deporte",
    "Tecnología e Informática",
    "Ciencias Sociales y Ciudadanía",
]

ESTRATEGIAS_BASE = [
    ("EST-2026-01", "Club de Robótica y Pensamiento Computacional", "STEM y Tecnología", "Formación en algoritmos, electrónica básica y diseño de prototipos escolares."),
    ("EST-2026-02", "Semillero de Lectura Crítica y Oralidad", "Lectura y Escritura", "Círculos de lectura, debate argumentativo y producción textual estudiantil."),
    ("EST-2026-03", "Escuela Deportiva de Fútbol y Convivencia", "Deporte y Recreación", "Práctica deportiva formativa orientada al trabajo en equipo y resolución pacífica."),
    ("EST-2026-04", "Laboratorio de Música Tradicional Colombiana", "Arte y Cultura", "Apropiación de ritmos regionales, interpretación instrumental y ensamble coral."),
    ("EST-2026-05", "Observatorio Ambiental y Huerta Escolar", "Medio Ambiente", "Proyectos de sostenibilidad, compostaje y monitoreo de biodiversidad local."),
    ("EST-2026-06", "Olimpiadas Regionales de Matemáticas", "STEM y Tecnología", "Entrenamiento extracurricular para resolución de problemas matemáticos avanzados."),
    ("EST-2026-07", "Taller de Cine, Radio y Medios Escolares", "Arte y Cultura", "Producción audiovisual juvenil y emisora escolar comunitaria."),
    ("EST-2026-08", "Liderazgo Juvenil y Gobierno Escolar", "Ciudadanía", "Formación en participación democrática, mediación escolar y proyectos sociales."),
    ("EST-2026-09", "Club de Bilingüismo e Inmersión Cultural", "Idiomas", "Conversatorios lúdicos en inglés y proyectos colaborativos internacionales."),
    ("EST-2026-10", "Atletismo y Bienestar Integral", "Deporte y Recreación", "Entrenamiento físico, hábitos saludables y jornadas recreativas intercolegiadas."),
    ("EST-2026-11", "Semillero de Astronomía y Ciencias del Espacio", "STEM y Tecnología", "Observación celeste y modelado físico para estudiantes de media vocacional."),
    ("EST-2026-12", "Taller de Teatro y Expresión Corporal", "Arte y Cultura", "Montaje escénico, improvisación y fortalecimiento de habilidades socioemocionales."),
    ("EST-2026-13", "Escuela de Ajedrez Estratégico", "Deporte y Recreación", "Desarrollo de concentración, toma de decisiones y torneos interinstitucionales."),
    ("EST-2026-14", "Laboratorio de Emprendimiento Social", "Ciudadanía", "Diseño de iniciativas comunitarias con impacto económico y social en el territorio."),
]

GRADOS = ["6°", "7°", "8°", "9°", "10°", "11°"]


def run_seed(num_estudiantes: int = 200, reset: bool = True):
    random.seed(2026)
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(Usuario).count() > 0:
            print("La base de datos ya contiene datos. Usa --reset para regenerar.")
            return

        pw = hash_password("sses2026")
        usuarios = [
            Usuario(
                nombre="Laura Camila Mendoza",
                email="responsable@mineducacion.gov.co",
                password_hash=pw,
                rol="RESPONSABLE_ESTRATEGIAS",
                region="Bogotá D.C.",
            ),
            Usuario(
                nombre="Carlos Andrés Gómez",
                email="tutor@mineducacion.gov.co",
                password_hash=pw,
                rol="TUTOR",
                region="Bogotá y Cundinamarca",
            ),
            Usuario(
                nombre="Diana Marcela Ospina",
                email="analista@mineducacion.gov.co",
                password_hash=pw,
                rol="ANALISTA_MINISTERIO",
                region="Nacional",
            ),
            Usuario(
                nombre="Dr. Hernando Ruiz (Contraloría)",
                email="control@contraloria.gov.co",
                password_hash=pw,
                rol="ENTE_CONTROL",
                region="Nacional",
            ),
            Usuario(
                nombre="Mateo Restrepo",
                email="tutor.ant@mineducacion.gov.co",
                password_hash=pw,
                rol="TUTOR",
                region="Antioquia",
            ),
            Usuario(
                nombre="Valentina Caicedo",
                email="tutor.valle@mineducacion.gov.co",
                password_hash=pw,
                rol="TUTOR",
                region="Valle del Cauca",
            ),
        ]
        db.add_all(usuarios)
        db.flush()

        responsable = usuarios[0]
        tutores = [usuarios[1], usuarios[4], usuarios[5]]

        # Entidades
        entidades = [
            Entidad(codigo=c, nombre=n, tipo=t, departamento=d, municipio=m)
            for c, n, t, d, m in ENTIDADES_DATA
        ]
        db.add_all(entidades)
        db.flush()

        # Docentes (25)
        docentes = []
        for i in range(1, 26):
            nom = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"
            ent = entidades[(i - 1) % len(entidades)]
            docentes.append(
                Docente(
                    documento=f"DOC-{10000 + i}",
                    nombre_completo=nom,
                    area=AREAS_DOCENTES[(i - 1) % len(AREAS_DOCENTES)],
                    email=f"docente{i}@educacion.edu.co",
                    entidad_id=ent.id,
                )
            )
        db.add_all(docentes)
        db.flush()

        # Estudiantes (200 por defecto)
        estudiantes = []
        for i in range(1, num_estudiantes + 1):
            nom = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"
            ent = entidades[(i - 1) % len(entidades)]
            estudiantes.append(
                Estudiante(
                    documento=f"10{200000 + i}",
                    nombre_completo=nom,
                    grado=GRADOS[(i - 1) % len(GRADOS)],
                    email=f"est.{i}@estudiante.edu.co",
                    entidad_id=ent.id,
                )
            )
        db.add_all(estudiantes)
        db.flush()

        # Estrategias (14)
        estrategias = []
        for idx, (cod, nom, linea, desc) in enumerate(ESTRATEGIAS_BASE):
            ent = entidades[idx % len(entidades)]
            est = Estrategia(
                codigo=cod,
                nombre=nom,
                descripcion=desc,
                linea_tematica=linea,
                periodo="2026-2",
                estado="ACTIVA" if idx < 12 else "BORRADOR",
                entidad_id=ent.id,
                creador_id=responsable.id,
            )
            estrategias.append(est)
        db.add_all(estrategias)
        db.flush()

        # Asociar docentes a estrategias
        doc_est_pairs = []
        for idx, est in enumerate(estrategias):
            assigned_docs = random.sample(docentes, k=2)
            for d in assigned_docs:
                de = DocenteEstrategia(estrategia_id=est.id, docente_id=d.id)
                db.add(de)
                doc_est_pairs.append((est, d))
        db.flush()

        # Vincular estudiantes a las primeras 10 estrategias (quedan bloqueadas para edición)
        # Las últimas 4 estrategias quedan sin estudiantes (editables para probar CU_003 y CU_004)
        est_idx = 0
        for est in estrategias[:10]:
            cantidad = random.randint(10, 18)
            slice_ests = estudiantes[est_idx : est_idx + cantidad]
            if not slice_ests:
                slice_ests = random.sample(estudiantes, k=8)
            est_idx = (est_idx + cantidad) % len(estudiantes)
            for s in slice_ests:
                db.add(
                    VinculacionEstudiante(
                        estrategia_id=est.id,
                        estudiante_id=s.id,
                        vinculado_por_id=responsable.id,
                    )
                )
        db.flush()

        # Acompañamientos mensuales y seguimientos semanales
        observaciones_sample = [
            "Revisión de planeación pedagógica y ajuste de actividades prácticas con el grupo.",
            "Observación de sesión en aula; buena participación estudiantil y uso de recursos.",
            "Retroalimentación sobre evaluación formativa y registro de evidencias en SSES.",
            "Cierre de módulo mensual con balance positivo de asistencia y metas cumplidas.",
        ]
        meses_piloto = [(2026, 8), (2026, 9), (2026, 10), (2026, 11)]
        acomp_count = 0
        seg_count = 0
        for est, doc in doc_est_pairs[:18]:
            for anio, mes in random.sample(meses_piloto, k=2):
                tutor = random.choice(tutores)
                modalidad = random.choice(["INDIVIDUAL", "GRUPAL"])
                acomp = Acompanamiento(
                    estrategia_id=est.id,
                    docente_id=doc.id,
                    tutor_id=tutor.id,
                    anio=anio,
                    mes=mes,
                    modalidad=modalidad,
                    participantes_grupo="Equipo docente de área y 2 coordinadores" if modalidad == "GRUPAL" else None,
                    descripcion=f"Acompañamiento pedagógico {modalidad.lower()} correspondiente a {est.nombre}.",
                )
                db.add(acomp)
                db.flush()
                acomp_count += 1

                num_semanas = random.randint(2, 4)
                for sem in range(1, num_semanas + 1):
                    dia = min(28, (sem - 1) * 7 + 3)
                    db.add(
                        SeguimientoSemanal(
                            acompanamiento_id=acomp.id,
                            semana=sem,
                            fecha=date(anio, mes, dia),
                            observaciones=observaciones_sample[(sem - 1) % len(observaciones_sample)],
                            avance_porcentaje=min(100, sem * 25),
                        )
                    )
                    seg_count += 1

        # Eventos iniciales de auditoría
        db.add_all(
            [
                EventoAuditoria(
                    usuario_id=responsable.id,
                    usuario_email=responsable.email,
                    rol=responsable.rol,
                    accion="CARGA_INICIAL_CATALOGOS",
                    entidad_afectada="Sistema",
                    entidad_id="SEED",
                    detalle=f"Precarga de {len(entidades)} entidades, {len(docentes)} docentes y {len(estudiantes)} estudiantes.",
                    permitido=True,
                ),
                EventoAuditoria(
                    usuario_id=responsable.id,
                    usuario_email=responsable.email,
                    rol=responsable.rol,
                    accion="VINCULAR_ESTUDIANTES",
                    entidad_afectada="Estrategia",
                    entidad_id="1",
                    detalle="Vinculación inicial de estudiantes a estrategias activas (bloqueo de edición activado).",
                    permitido=True,
                ),
            ]
        )

        db.commit()
        print(
            f"Seed completado: {len(usuarios)} usuarios, {len(entidades)} entidades, "
            f"{len(docentes)} docentes, {len(estudiantes)} estudiantes, "
            f"{len(estrategias)} estrategias, {acomp_count} acompañamientos, {seg_count} seguimientos."
        )
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generador de volumen mock para SSES Piloto")
    parser.add_argument("--estudiantes", type=int, default=200, help="Cantidad de estudiantes a generar")
    parser.add_argument("--no-reset", action="store_true", help="No borrar datos existentes")
    args = parser.parse_args()
    run_seed(num_estudiantes=args.estudiantes, reset=not args.no_reset)
