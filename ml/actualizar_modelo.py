# ==========================================
# Actualización del modelo (huella + lock)
# Reutiliza entrenamiento.py. No cambia el algoritmo.
# ==========================================

import os
from contextlib import contextmanager

from cargar_datos import cargar_datos
from entrenamiento import calcular_huella_dataset, entrenar, historial_ha_cambiado
from persistencia import (
    RUTA_LOCK,
    CARPETA_MODELOS,
    cargar_estado_entrenamiento,
    existe_modelo,
)


class ActualizacionEnCurso(Exception):
    """Otro proceso ya está entrenando."""


def _limpiar_lock_obsoleto(max_edad_segundos=1800):
    """Si un proceso murió a medias, libera el lock tras 30 minutos."""
    if not RUTA_LOCK.exists():
        return
    try:
        edad = os.path.getmtime(RUTA_LOCK)
        import time

        if time.time() - edad > max_edad_segundos:
            RUTA_LOCK.unlink(missing_ok=True)
    except OSError:
        pass


@contextmanager
def bloqueo_entrenamiento():
    """Evita entrenamientos simultáneos (archivo exclusivo)."""
    CARPETA_MODELOS.mkdir(parents=True, exist_ok=True)
    _limpiar_lock_obsoleto()
    try:
        fd = os.open(str(RUTA_LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise ActualizacionEnCurso(
            "Ya hay una actualización del modelo en curso."
        ) from exc

    try:
        os.write(fd, str(os.getpid()).encode("ascii"))
        yield
    finally:
        os.close(fd)
        try:
            RUTA_LOCK.unlink(missing_ok=True)
        except OSError:
            pass


def estado_publico():
    """Datos seguros para el panel (sin métricas técnicas)."""
    estado = cargar_estado_entrenamiento() or {}
    return {
        "modelo_disponible": existe_modelo(),
        "fecha_actualizacion": estado.get("fecha_actualizacion"),
        "n_actividades": estado.get("n_filas"),
        "en_pruebas": True,
    }


def actualizar_modelo(*, forzar=False, motivo="manual"):
    """
    Proceso único:
    1) Lee Supabase (Finalizada + Inscripción, Confirmadas)
    2) Compara huella
    3) Si no hay cambios → no reentrena
    4) Si hay cambios → entrena y guarda (atómico vía persistencia)
    """
    with bloqueo_entrenamiento():
        df = cargar_datos()
        huella_actual = calcular_huella_dataset(df)
        cambio, huella = historial_ha_cambiado(df)

        if df.empty:
            return {
                "ok": True,
                "actualizado": False,
                "codigo": "sin_datos",
                "mensaje": "Todavía no hay actividades finalizadas con inscripción para actualizar.",
                "huella": huella,
                "motivo": motivo,
                **estado_publico(),
            }

        if not forzar and not cambio:
            return {
                "ok": True,
                "actualizado": False,
                "codigo": "sin_cambios",
                "mensaje": "No hay datos nuevos. Las estimaciones siguen con la versión actual.",
                "huella": huella,
                "motivo": motivo,
                **estado_publico(),
            }

        try:
            resultado = entrenar(
                df=df,
                mostrar_grafico=False,
                omitir_si_igual=False,
            )
        except Exception as exc:
            # No se sobrescribe el .joblib: entrenar solo guarda al final con éxito.
            return {
                "ok": False,
                "actualizado": False,
                "codigo": "error_entrenamiento",
                "mensaje": "No se pudo actualizar el modelo. Se mantiene la versión anterior.",
                "detalle": str(exc),
                "huella": huella_actual,
                "motivo": motivo,
                **estado_publico(),
            }

        if not resultado.get("ok"):
            razon = resultado.get("razon") or "error"
            if razon == "datos_insuficientes":
                mensaje = (
                    "Aún no hay suficientes actividades finalizadas para "
                    "actualizar las estimaciones."
                )
            elif razon == "sin_datos":
                mensaje = "Todavía no hay actividades finalizadas con inscripción para actualizar."
            else:
                mensaje = "No se pudo actualizar el modelo. Se mantiene la versión anterior."
            return {
                "ok": True,
                "actualizado": False,
                "codigo": razon,
                "mensaje": mensaje,
                "huella": resultado.get("huella") or huella,
                "motivo": motivo,
                **estado_publico(),
            }

        return {
            "ok": True,
            "actualizado": True,
            "codigo": "actualizado",
            "mensaje": "Las estimaciones se actualizaron con el histórico más reciente.",
            "huella": resultado.get("huella") or huella,
            "motivo": motivo,
            **estado_publico(),
        }


if __name__ == "__main__":
    salida = actualizar_modelo(motivo="cli")
    print(salida)
