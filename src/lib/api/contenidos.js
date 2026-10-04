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
    const error = new Error(body?.error?.message || "No fue posible completar la acción");
    error.status = response.status;
    error.code = body?.error?.code || "REQUEST_FAILED";
    throw error;
  }

  return body.data;
}

export function getContenidoAdmin(id) {
  return requestJson(`/api/admin/contenidos/${id}`);
}

export function createContenido(payload) {
  return requestJson("/api/admin/contenidos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateContenido(id, payload) {
  return requestJson(`/api/admin/contenidos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setEstadoContenido(id, estado) {
  return requestJson(`/api/admin/contenidos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export function deleteContenido(id) {
  return requestJson(`/api/admin/contenidos/${id}`, {
    method: "DELETE",
  });
}
