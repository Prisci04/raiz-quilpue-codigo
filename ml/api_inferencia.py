# ==========================================
# Servicio ML (FastAPI) — solo red privada / localhost
# Predicción + actualización del modelo. No expone .joblib ni claves.
# ==========================================

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from actualizar_modelo import (
    ActualizacionEnCurso,
    actualizar_modelo,
    estado_publico,
)
from persistencia import existe_modelo
from prediccion import predecir_asistencia

RAIZ = Path(__file__).resolve().parent.parent
load_dotenv(RAIZ / ".env.local")
load_dotenv(RAIZ / ".env")

app = FastAPI(title="Raíz Quilpué — estimación de inscripciones", docs_url=None, redoc_url=None)


class PrediccionEntrada(BaseModel):
    fecha: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    hora_inicio: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$")
    id_modalidad: int = Field(..., ge=1)
    id_publico: int = Field(..., ge=1)
    id_costo: int = Field(..., ge=1)
    cupos_max: int | None = Field(default=None, ge=1)
    cupos_espera: int | None = Field(default=None, ge=0)


class ActualizacionEntrada(BaseModel):
    forzar: bool = False
    motivo: str = Field(default="api", max_length=64)


def _autorizar(authorization: str | None):
    secret = (os.getenv("ML_INFERENCE_SECRET") or "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="Servicio de estimación no configurado.")
    esperado = f"Bearer {secret}"
    if not authorization or authorization.strip() != esperado:
        raise HTTPException(status_code=401, detail="No autorizado.")


@app.get("/salud")
def salud():
    return {
        "ok": True,
        "modelo_disponible": existe_modelo(),
    }


@app.get("/estado-modelo")
def obtener_estado_modelo(authorization: str | None = Header(default=None)):
    _autorizar(authorization)
    return estado_publico()


@app.post("/actualizar-modelo")
def post_actualizar_modelo(
    body: ActualizacionEntrada | None = None,
    authorization: str | None = Header(default=None),
):
    _autorizar(authorization)
    payload = body or ActualizacionEntrada()
    motivo = (payload.motivo or "api").strip()[:64] or "api"

    try:
        resultado = actualizar_modelo(forzar=bool(payload.forzar), motivo=motivo)
    except ActualizacionEnCurso as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el modelo. Se mantiene la versión anterior.",
        ) from None

    if not resultado.get("ok") and resultado.get("codigo") == "error_entrenamiento":
        raise HTTPException(
            status_code=500,
            detail=resultado.get("mensaje")
            or "No se pudo actualizar el modelo. Se mantiene la versión anterior.",
        )

    return resultado


@app.post("/predecir")
def predecir(
    body: PrediccionEntrada,
    authorization: str | None = Header(default=None),
):
    _autorizar(authorization)

    if not existe_modelo():
        raise HTTPException(
            status_code=503,
            detail="Todavía no hay un modelo listo para estimar.",
        )

    try:
        estimado = predecir_asistencia(
            fecha=body.fecha,
            hora_inicio=body.hora_inicio,
            id_modalidad=body.id_modalidad,
            id_publico=body.id_publico,
            id_costo=body.id_costo,
            cupos_max=body.cupos_max,
            cupos_espera=body.cupos_espera,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Todavía no hay un modelo listo para estimar.",
        ) from None
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible calcular la estimación.",
        ) from None

    return {
        "estimado": int(estimado),
        "unidad": "inscripciones_confirmadas",
        "en_pruebas": True,
    }


if __name__ == "__main__":
    import uvicorn

    puerto = int(os.getenv("ML_INFERENCE_PORT") or "8000")
    uvicorn.run(
        "api_inferencia:app",
        host="127.0.0.1",
        port=puerto,
        reload=False,
    )
