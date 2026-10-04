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

export function listUsuariosPanel() {
  return requestJson("/api/admin/usuarios");
}

export function createUsuario(payload) {
  return requestJson("/api/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUsuario(id, payload) {
  return requestJson(`/api/admin/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setEstadoUsuario(id, estado) {
  return requestJson(`/api/admin/usuarios/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export function deleteUsuario(id) {
  return requestJson(`/api/admin/usuarios/${id}`, {
    method: "DELETE",
  });
}

export async function getSessionUser() {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    return null;
  }

  return body.data;
}
