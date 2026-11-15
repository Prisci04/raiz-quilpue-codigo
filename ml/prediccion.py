# ==========================================
# RAÍZ QUILPUÉ - MACHINE LEARNING
# Predicción de inscripciones confirmadas
# ==========================================

from datetime import date

import numpy as np
import pandas as pd

from persistencia import (
    cargar_estado_entrenamiento,
    cargar_modelo,
    existe_modelo,
)


def _techo_historico_experimental(estimado):
    """
    Con pocos datos, evita cifras disparatadas por extrapolación
    cuando no hay cupos configurados.
    """
    estado = cargar_estado_entrenamiento() or {}
    y_max = estado.get("y_max")
    if y_max is None:
        return estimado
    try:
        y_max = int(y_max)
    except (TypeError, ValueError):
        return estimado
    if y_max < 0:
        return estimado
    techo = max(y_max * 2, y_max + 10)
    return min(estimado, techo)


def _capacidad_configurada(cupos_max, cupos_espera):
    """
    Cupos disponibles según el formulario:
    oficiales + lista de espera. None si no hay cupos oficiales.
    """
    if cupos_max is None:
        return None
    try:
        oficiales = int(cupos_max)
    except (TypeError, ValueError):
        return None
    if oficiales < 1:
        return None

    espera = 0
    if cupos_espera is not None and str(cupos_espera).strip() != "":
        try:
            espera = int(cupos_espera)
        except (TypeError, ValueError):
            espera = 0
        if espera < 0:
            espera = 0

    return oficiales + espera


def _aplicar_limite_cupos(estimado, cupos_max, cupos_espera):
    """La estimación no puede superar los cupos que configuró el admin."""
    capacidad = _capacidad_configurada(cupos_max, cupos_espera)
    if capacidad is None:
        return _techo_historico_experimental(estimado)
    return min(estimado, capacidad)


def _normalizar_cupos_max(cupos_max):
    """None / vacío → NaN (imputación mediana). No convertir a 0."""
    if cupos_max is None:
        return np.nan
    if isinstance(cupos_max, str) and cupos_max.strip() == "":
        return np.nan
    try:
        valor = float(cupos_max)
    except (TypeError, ValueError):
        return np.nan
    if np.isnan(valor):
        return np.nan
    return valor


def preparar_actividad(
    fecha,
    hora_inicio,
    id_modalidad,
    id_publico,
    id_costo,
    cupos_max=None,
):
    fecha_actividad = date.fromisoformat(fecha)

    if hora_inicio:
        partes = str(hora_inicio).strip().split(":")
        hora = int(partes[0])
    else:
        hora = np.nan

    actividad = pd.DataFrame([{
        "mes": fecha_actividad.month,
        "dia_semana": fecha_actividad.weekday(),
        "hora": hora,
        "cupos_max": _normalizar_cupos_max(cupos_max),
        "id_modalidad": id_modalidad,
        "id_publico": id_publico,
        "id_costo": id_costo,
    }])

    for columna in actividad.columns:
        actividad[columna] = pd.to_numeric(
            actividad[columna],
            errors="coerce",
        )

    return actividad


def predecir_asistencia(
    fecha,
    hora_inicio,
    id_modalidad,
    id_publico,
    id_costo,
    cupos_max=None,
    cupos_espera=None,
):
    """
    Estima inscripciones confirmadas.
    cupos_espera no es variable del modelo: solo limita el techo
    junto con cupos_max (capacidad total configurada).
    """
    if not existe_modelo():
        raise FileNotFoundError(
            "No hay un modelo guardado. "
            "Ejecuta primero ml/entrenamiento.py."
        )

    modelo = cargar_modelo()
    X_nueva = preparar_actividad(
        fecha,
        hora_inicio,
        id_modalidad,
        id_publico,
        id_costo,
        cupos_max=cupos_max,
    )
    prediccion = modelo.predict(X_nueva)
    estimado = max(0, round(float(prediccion[0])))
    return _aplicar_limite_cupos(estimado, cupos_max, cupos_espera)


if __name__ == "__main__":
    if not existe_modelo():
        print("Todavía no existe un modelo. Ejecuta ml/entrenamiento.py")
    else:
        print("Modelo encontrado.")
        estimado = predecir_asistencia(
            fecha="2026-08-20",
            hora_inicio="18:00",
            id_modalidad=1,
            id_publico=1,
            id_costo=1,
            cupos_max=10,
            cupos_espera=5,
        )
        print(
            f"Predicción de ejemplo (10+5 cupos): "
            f"{estimado} inscripciones confirmadas."
        )
