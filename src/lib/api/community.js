async function request(path, options = {}) {
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
    throw new Error(
      body?.error?.message ||
        "No fue posible completar la acción.",
    );
  }

  return body.data;
}

// ACTIVIDADES

export const getParticipantes = (id) =>
  request(`/api/admin/actividades/${id}/participantes`);

export const getActividadAdmin = (id) =>
  request(`/api/admin/actividades/${id}`);

export const saveActividad = (payload, id) =>
  request(
    id
      ? `/api/admin/actividades/${id}`
      : "/api/admin/actividades",
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    },
  );

export const deleteActividad = (id) =>
  request(`/api/admin/actividades/${id}`, {
    method: "DELETE",
  });

// MUSEO DIGITAL - PIEZAS

export const getPiezaMuseo = (id) =>
  request(`/api/admin/museo/${id}`);

export const savePiezaMuseo = (payload, id) =>
  request(
    id
      ? `/api/admin/museo/${id}`
      : "/api/admin/museo",
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    },
  );

export const deletePiezaMuseo = (id) =>
  request(`/api/admin/museo/${id}`, {
    method: "DELETE",
  });

// MUSEO DIGITAL - APORTES DE LA COMUNIDAD

export const getAportesMuseo = () =>
  request("/api/admin/museo/aportes");

export const deleteAporteMuseo = (id) =>
  request(`/api/admin/museo/aportes/${id}`, {
    method: "DELETE",
  });

export const convertirAporteEnBorrador = (id) =>
  request(
    `/api/admin/museo/aportes/${id}/convertir`,
    {
      method: "POST",
    },
  );

export const rechazarAporteMuseo = (id) =>
  request(
    `/api/admin/museo/aportes/${id}/rechazar`,
    {
      method: "POST",
    },
  );  