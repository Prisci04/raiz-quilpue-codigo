async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.error?.message || "No se pudo completar la solicitud.",
    );
  }

  return body.data;
}

export function getEstadoEstimaciones() {
  return requestJson("/api/admin/ml/estado", { method: "GET", cache: "no-store" });
}

export function actualizarEstimaciones() {
  return requestJson("/api/admin/ml/actualizar", { method: "POST" });
}
