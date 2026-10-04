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
      body?.error?.message || "No fue posible completar la acción",
    );
    error.status = response.status;
    error.code = body?.error?.code || "REQUEST_FAILED";
    throw error;
  }

  return body.data;
}

export function getPerfil() {
  return requestJson("/api/admin/perfil");
}

export function updatePerfil(payload) {
  return requestJson("/api/admin/perfil", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updatePassword(payload) {
  return requestJson("/api/admin/perfil/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function closeOtherSessions() {
  return requestJson("/api/admin/perfil/sesiones", {
    method: "DELETE",
  });
}
