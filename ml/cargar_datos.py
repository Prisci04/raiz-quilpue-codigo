# ==========================================
# RAÍZ QUILPUÉ - MACHINE LEARNING
# Carga y validación del histórico desde Supabase
# ==========================================

from pathlib import Path

import pandas as pd

from conexion_supabase import obtener_dataset_entrenamiento


# 1. COLUMNAS DEL DATASET ML

VARIABLE_OBJETIVO = "total_inscripciones"

# Incluye cupos_max. Nulos se imputan en el pipeline (mediana), no se fuerzan a 0.
VARIABLES_PREDICTORAS = [
    "mes",
    "dia_semana",
    "hora",
    "cupos_max",
    "id_modalidad",
    "id_publico",
    "id_costo",
]

# Cambia si se añaden/quitan predictoras → invalida huella y modelo previos.
VERSION_ESQUEMA_PREDICTORES = "7vars-cupos_max-cat-tiempo"

COLUMNAS_BASE = [
    "id_actividad",
    "titulo",
    "fecha",
    "hora_inicio",
    "cupos_max",
    "id_modalidad",
    "id_publico",
    "id_costo",
    VARIABLE_OBJETIVO,
]

# Columnas que definen la huella del histórico (cambio → posible reentrenamiento).
COLUMNAS_HUELLA = [
    "id_actividad",
    "fecha",
    "hora_inicio",
    "cupos_max",
    "id_modalidad",
    "id_publico",
    "id_costo",
    VARIABLE_OBJETIVO,
]

# CSV legado (solo referencia / migración manual; la fuente principal es Supabase).
RUTA_CSV = (
    Path(__file__).resolve().parent
    / "data"
    / "asistencias.csv"
)


# 2. VALIDACIÓN

def _es_completo(fila):
    """
    Registro auténtico y usable: fecha válida y objetivo entero >= 0.
    Cero confirmadas es válido. Los predictores pueden ser nulos
    (el pipeline los imputa); no se inventa asistencia.
    """
    if pd.isna(fila["fecha"]):
        return False
    total = fila[VARIABLE_OBJETIVO]
    if pd.isna(total):
        return False
    try:
        total_num = float(total)
    except (TypeError, ValueError):
        return False
    if total_num < 0 or total_num % 1 != 0:
        return False
    return True


def validar_dataset(df):
    if df.empty:
        return df

    df = df.copy()
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df[VARIABLE_OBJETIVO] = pd.to_numeric(
        df[VARIABLE_OBJETIVO],
        errors="coerce",
    )

    for columna in (
        "id_modalidad",
        "id_publico",
        "id_costo",
        "id_actividad",
        "cupos_max",
    ):
        if columna in df.columns:
            df[columna] = pd.to_numeric(df[columna], errors="coerce")

    mask = df.apply(_es_completo, axis=1)
    df = df.loc[mask].copy()
    df[VARIABLE_OBJETIVO] = df[VARIABLE_OBJETIVO].astype(int)
    df = df.sort_values(["fecha", "id_actividad"]).reset_index(drop=True)
    return df


# 3. FEATURES DERIVADAS (compartidas con entrenamiento)

def agregar_features_temporales(df):
    df = df.copy()
    df["mes"] = df["fecha"].dt.month
    df["dia_semana"] = df["fecha"].dt.dayofweek
    df["hora"] = pd.to_numeric(
        df["hora_inicio"]
        .astype("string")
        .str.extract(r"^(\d{1,2}):", expand=False),
        errors="coerce",
    )
    return df


def preparar_matriz_X(df):
    """DataFrame solo con las variables predictoras, numéricas (NaN permitido)."""
    X = df[VARIABLES_PREDICTORAS].copy()
    for columna in VARIABLES_PREDICTORAS:
        X[columna] = pd.to_numeric(X[columna], errors="coerce")
    return X


# 4. CARGA PRINCIPAL DESDE SUPABASE

def cargar_datos():
    """
    Fuente principal: Supabase vía conexion_supabase.
    Solo Finalizada + Inscripción; objetivo = confirmadas agregadas.
    """
    filas = obtener_dataset_entrenamiento()
    if not filas:
        print("No hay actividades Finalizada con inscripción en Supabase.")
        return pd.DataFrame(columns=COLUMNAS_BASE)

    df = pd.DataFrame(filas)
    faltantes = [c for c in COLUMNAS_BASE if c not in df.columns]
    if faltantes:
        raise ValueError(f"Faltan columnas en el dataset: {faltantes}")

    df = validar_dataset(df)
    if df.empty:
        print("El dataset no tiene filas válidas tras la validación.")
    return df


# 5. EJECUTAR EL SCRIPT

if __name__ == "__main__":
    df = cargar_datos()
    print("\nTotal de actividades válidas:", len(df))
    print("\nPrimeros registros:")
    print(df.head())
    if not df.empty:
        print("\nDistribución de", VARIABLE_OBJETIVO + ":")
        print(df[VARIABLE_OBJETIVO].describe())
    print("\nInformación del dataset:")
    df.info()
