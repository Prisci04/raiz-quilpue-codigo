async function requestJson(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers,
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    const error = new Error(
      body?.error?.message || "No fue posible completar la acción.",
    );
    error.status = response.status;
    error.code = body?.error?.code || "REQUEST_FAILED";
    throw error;
  }

  return body.data;
}

export function getUbicaciones({ idRegion, idComuna } = {}) {
  const params = new URLSearchParams();

  if (idRegion) params.set("id_region", String(idRegion));
  if (idComuna) params.set("id_comuna", String(idComuna));

  const query = params.toString();
  return requestJson(`/api/ubicaciones${query ? `?${query}` : ""}`);
}
