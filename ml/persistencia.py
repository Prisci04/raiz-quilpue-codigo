# ==========================================
# RAÍZ QUILPUÉ - MACHINE LEARNING
# Guardar / cargar modelo y estado de entrenamiento
# ==========================================

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib


# 1. UBICACIONES LOCALES

CARPETA_MODELOS = Path(__file__).resolve().parent / "modelos"

RUTA_MODELO = CARPETA_MODELOS / "modelo_asistencia.joblib"
RUTA_ESTADO = CARPETA_MODELOS / "ultimo_entrenamiento.json"
RUTA_LOCK = CARPETA_MODELOS / "entrenamiento.lock"


# 2. GUARDAR / CARGAR MODELO

def guardar_modelo(modelo):
    """Escribe primero a .tmp y reemplaza: no deja un .joblib a medias."""
    from sklearn.utils.validation import check_is_fitted

    check_is_fitted(modelo)
    CARPETA_MODELOS.mkdir(parents=True, exist_ok=True)
    temporal = RUTA_MODELO.with_suffix(".joblib.tmp")
    joblib.dump(modelo, temporal)
    os.replace(temporal, RUTA_MODELO)
    return RUTA_MODELO


def cargar_modelo():
    if not RUTA_MODELO.exists():
        raise FileNotFoundError(
            "Todavía no existe un modelo entrenado. "
            "Ejecuta ml/entrenamiento.py"
        )
    return joblib.load(RUTA_MODELO)


def existe_modelo():
    return RUTA_MODELO.exists()


# 3. ESTADO / HUELLA DEL ÚLTIMO ENTRENAMIENTO

def guardar_estado_entrenamiento(
    huella,
    metricas=None,
    n_filas=None,
    *,
    metricas_ilustrativas=False,
    esquema=None,
    predictoras=None,
    y_min=None,
    y_max=None,
    y_media=None,
    fecha_actualizacion=None,
):
    CARPETA_MODELOS.mkdir(parents=True, exist_ok=True)
    if fecha_actualizacion is None:
        fecha_actualizacion = datetime.now(timezone.utc).isoformat()
    payload = {
        "huella": huella,
        "n_filas": n_filas,
        "esquema": esquema,
        "predictoras": list(predictoras) if predictoras else None,
        "y_min": y_min,
        "y_max": y_max,
        "y_media": y_media,
        "fecha_actualizacion": fecha_actualizacion,
        "metricas_ilustrativas": bool(metricas_ilustrativas),
        "metricas": metricas or {},
    }
    temporal = RUTA_ESTADO.with_suffix(".json.tmp")
    temporal.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    os.replace(temporal, RUTA_ESTADO)
    return RUTA_ESTADO


def cargar_estado_entrenamiento():
    if not RUTA_ESTADO.exists():
        return None
    try:
        return json.loads(RUTA_ESTADO.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def cargar_huella_ultimo_entrenamiento():
    estado = cargar_estado_entrenamiento()
    if not estado:
        return None
    return estado.get("huella")
