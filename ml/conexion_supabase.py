# Conexión con Supabase (solo servidor / scripts locales).
# No expone la clave secreta al frontend.

import os
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


# 1. CARGAR VARIABLES DE ENTORNO

RAIZ_PROYECTO = Path(__file__).resolve().parent.parent
load_dotenv(RAIZ_PROYECTO / ".env.local")
load_dotenv(RAIZ_PROYECTO / ".env")


# 2. OBTENER CREDENCIALES (solo variables de entorno)

SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
)

SUPABASE_KEY = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Nombres oficiales de catálogo (no se asumen IDs numéricos).
NOMBRE_ESTADO_FINALIZADA = "Finalizada"
NOMBRE_PARTICIPACION_INSCRIPCION = "Inscripción"
NOMBRE_INSCRIPCION_CONFIRMADA = "Confirmada"

COLUMNAS_ACTIVIDAD_ML = (
    "id_actividad,"
    "titulo,"
    "fecha,"
    "hora_inicio,"
    "cupos_max,"
    "id_modalidad,"
    "id_publico,"
    "id_costo,"
    "id_estado,"
    "id_tipo_participacion"
)


# 3. CREAR CONEXIÓN

def conectar_supabase():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Faltan credenciales de Supabase en .env.local "
            "(NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY)."
        )

    return create_client(SUPABASE_URL, SUPABASE_KEY)


# 4. CATÁLOGOS (resolver IDs por nombre)

def obtener_id_por_nombre(tabla, columna_id, columna_nombre, nombre):
    """Devuelve el id de un catálogo buscando por nombre exacto."""
    supabase = conectar_supabase()
    respuesta = (
        supabase.table(tabla)
        .select(f"{columna_id},{columna_nombre}")
        .eq(columna_nombre, nombre)
        .limit(1)
        .execute()
    )
    filas = respuesta.data or []
    if not filas:
        raise ValueError(
            f"No se encontró '{nombre}' en {tabla}.{columna_nombre}."
        )
    return filas[0][columna_id]


def id_estado_finalizada():
    return obtener_id_por_nombre(
        "estado_publicacion",
        "id_estado",
        "nombre_estado",
        NOMBRE_ESTADO_FINALIZADA,
    )


def id_tipo_participacion_inscripcion():
    return obtener_id_por_nombre(
        "tipo_participacion",
        "id_tipo_participacion",
        "nombre_tipo_participacion",
        NOMBRE_PARTICIPACION_INSCRIPCION,
    )


def id_inscripcion_confirmada():
    return obtener_id_por_nombre(
        "estado_inscripcion",
        "id_estado_inscripcion",
        "nombre_estado_inscripcion",
        NOMBRE_INSCRIPCION_CONFIRMADA,
    )


# 5. CONSULTAR ACTIVIDADES ELEGIBLES PARA ML

def obtener_actividades_ml():
    """
    Actividades Finalizada con participación Inscripción.
    Sin datos personales de participantes.
    """
    supabase = conectar_supabase()
    id_finalizada = id_estado_finalizada()
    id_inscripcion = id_tipo_participacion_inscripcion()

    respuesta = (
        supabase.table("actividades")
        .select(COLUMNAS_ACTIVIDAD_ML)
        .eq("id_estado", id_finalizada)
        .eq("id_tipo_participacion", id_inscripcion)
        .order("fecha")
        .order("id_actividad")
        .execute()
    )
    return respuesta.data or []


# 6. CONTAR INSCRIPCIONES CONFIRMADAS (agregado)

def contar_inscripciones_confirmadas(ids_actividad):
    """
    Cuenta solo Confirmada por actividad.
    No lee nombre, correo ni teléfono.
    """
    ids = [int(i) for i in ids_actividad if i is not None]
    if not ids:
        return {}

    supabase = conectar_supabase()
    id_confirmada = id_inscripcion_confirmada()
    contador = Counter()

    # PostgREST limita el tamaño de .in_; se consulta por lotes.
    tamano = 200
    for inicio in range(0, len(ids), tamano):
        lote = ids[inicio:inicio + tamano]
        respuesta = (
            supabase.table("inscripciones")
            .select("id_actividad")
            .eq("id_estado_inscripcion", id_confirmada)
            .in_("id_actividad", lote)
            .execute()
        )
        for fila in respuesta.data or []:
            contador[int(fila["id_actividad"])] += 1

    return {actividad_id: contador.get(actividad_id, 0) for actividad_id in ids}


def contar_inscripciones(id_actividad):
    """Compatibilidad: total Confirmada de una actividad."""
    return contar_inscripciones_confirmadas([id_actividad]).get(
        int(id_actividad),
        0,
    )


# 7. DATASET AGREGADO PARA ENTRENAMIENTO

def obtener_dataset_entrenamiento():
    """
    Lista de dicts con columnas de actividad + total_inscripciones.
    Las actividades elegibles sin confirmadas quedan en 0.
    """
    actividades = obtener_actividades_ml()
    ids = [fila["id_actividad"] for fila in actividades]
    totales = contar_inscripciones_confirmadas(ids)

    filas = []
    for actividad in actividades:
        actividad_id = actividad["id_actividad"]
        filas.append({
            "id_actividad": actividad_id,
            "titulo": actividad.get("titulo"),
            "fecha": actividad.get("fecha"),
            "hora_inicio": actividad.get("hora_inicio"),
            "cupos_max": actividad.get("cupos_max"),
            "id_modalidad": actividad.get("id_modalidad"),
            "id_publico": actividad.get("id_publico"),
            "id_costo": actividad.get("id_costo"),
            "total_inscripciones": totales.get(int(actividad_id), 0),
        })
    return filas


# 8. PROBAR CONEXIÓN

if __name__ == "__main__":
    dataset = obtener_dataset_entrenamiento()
    print("\nConexión con Supabase exitosa.")
    print(f"Actividades Finalizada con inscripción: {len(dataset)}")
    for fila in dataset[:10]:
        print(
            f"\nActividad: {fila['titulo']}"
            f"\nID: {fila['id_actividad']}"
            f"\nFecha: {fila['fecha']}"
            f"\nInscripciones confirmadas: {fila['total_inscripciones']}"
        )
