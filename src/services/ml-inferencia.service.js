import "server-only";

/**
 * Llama al servicio Python de inferencia.
 * El navegador nunca habla con FastAPI directamente.
 */
export async function solicitarEstimacionInscripciones(payload) {
  const base = (process.env.ML_INFERENCE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const secret = (process.env.ML_INFERENCE_SECRET || "").trim();

  if (!secret) {
    const error = new Error(
      "La estimación no está disponible por ahora. Intenta más tarde.",
    );
    error.code = "ML_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${base}/predecir`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    const error = new Error(
      "No pudimos contactar el servicio de estimación. Comprueba que esté en marcha.",
    );
    error.code = "ML_UNAVAILABLE";
    error.status = 503;
    throw error;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : "No fue posible calcular la estimación.";
    const error = new Error(
      response.status === 503
        ? "La estimación aún está en preparación. Vuelve a intentarlo más tarde."
        : detail,
    );
    error.code = "ML_INFERENCE_FAILED";
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw error;
  }

  const estimado = Number(body?.estimado);
  if (!Number.isFinite(estimado) || estimado < 0) {
    const error = new Error("La estimación devolvió un resultado inválido.");
    error.code = "ML_BAD_RESPONSE";
    error.status = 502;
    throw error;
  }

  return {
    estimado: Math.round(estimado),
    en_pruebas: body?.en_pruebas !== false,
  };
}
