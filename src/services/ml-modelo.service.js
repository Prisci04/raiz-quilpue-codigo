import "server-only";

function mlBaseUrl() {
  return (process.env.ML_INFERENCE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

function mlSecret() {
  return (process.env.ML_INFERENCE_SECRET || "").trim();
}

function assertConfigured() {
  const secret = mlSecret();
  if (!secret) {
    const error = new Error(
      "Las estimaciones no están configuradas en el servidor.",
    );
    error.code = "ML_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }
  return secret;
}

async function mlFetch(path, { method = "GET", body, timeoutMs = 15000 } = {}) {
  const secret = assertConfigured();
  let response;
  try {
    response = await fetch(`${mlBaseUrl()}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: body == null ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    const error = new Error(
      "No pudimos contactar el servicio de estimaciones. Comprueba que esté en marcha.",
    );
    error.code = "ML_UNAVAILABLE";
    error.status = 503;
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : typeof payload?.mensaje === "string"
          ? payload.mensaje
          : "No se pudo completar la operación de estimaciones.";
    const error = new Error(detail);
    error.code =
      response.status === 409 ? "ML_BUSY" : "ML_REQUEST_FAILED";
    error.status =
      response.status >= 400 && response.status < 600 ? response.status : 502;
    error.payload = payload;
    throw error;
  }

  return payload;
}

/**
 * Estado público del modelo (sin métricas técnicas).
 */
export async function obtenerEstadoModelo() {
  const data = await mlFetch("/estado-modelo");
  return {
    modelo_disponible: Boolean(data?.modelo_disponible),
    fecha_actualizacion: data?.fecha_actualizacion ?? null,
    n_actividades: Number.isFinite(Number(data?.n_actividades))
      ? Number(data.n_actividades)
      : null,
    en_pruebas: data?.en_pruebas !== false,
  };
}

/**
 * Solicita actualización (huella → reentrena solo si hay cambios).
 * Timeout largo: el entrenamiento corre en el host Python.
 */
export async function solicitarActualizacionModelo({
  motivo = "manual",
  forzar = false,
} = {}) {
  const data = await mlFetch("/actualizar-modelo", {
    method: "POST",
    body: { motivo, forzar: Boolean(forzar) },
    timeoutMs: 180000,
  });

  return {
    ok: data?.ok !== false,
    actualizado: Boolean(data?.actualizado),
    codigo: data?.codigo || (data?.actualizado ? "actualizado" : "sin_cambios"),
    mensaje:
      data?.mensaje ||
      (data?.actualizado
        ? "Las estimaciones se actualizaron."
        : "No hay datos nuevos."),
    fecha_actualizacion: data?.fecha_actualizacion ?? null,
    n_actividades: Number.isFinite(Number(data?.n_actividades))
      ? Number(data.n_actividades)
      : null,
    en_pruebas: data?.en_pruebas !== false,
  };
}

/**
 * Disparo en segundo plano: no bloquea al llamador.
 */
export function programarActualizacionModelo(motivo = "finalizacion") {
  void solicitarActualizacionModelo({ motivo, forzar: false }).catch((error) => {
    console.error("[ml-modelo] actualización en segundo plano:", error?.message || error);
  });
}
