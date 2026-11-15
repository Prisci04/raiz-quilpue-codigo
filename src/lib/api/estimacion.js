async function requestEstimacion(payload) {
  const response = await fetch("/api/admin/actividades/estimacion", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.error?.message ||
        "No fue posible calcular la estimación.",
    );
  }

  return body.data;
}

export function calcularEstimacionInscripciones(payload) {
  return requestEstimacion(payload);
}
