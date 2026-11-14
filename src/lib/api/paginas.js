/*
  Cliente del módulo Gestión de Páginas (solo navegador). Cada función devuelve
  el contenido actualizado que responde el servidor para que la interfaz refleje
  exactamente lo que quedó guardado.
*/

async function request(path, { json, form, method = "GET" } = {}) {
  const headers = new Headers({ Accept: "application/json" });
  let body;

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }

  let response;

  try {
    response = await fetch(path, { method, body, headers, credentials: "same-origin" });
  } catch {
    throw new Error("No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.");
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error?.message || "No fue posible completar la acción.");
    error.status = response.status;
    throw error;
  }

  return payload.data;
}

const base = "/api/admin/paginas";

export const guardarCampos = (idPagina, codigoSeccion, campos) =>
  request(`${base}/${idPagina}/secciones/${codigoSeccion}`, {
    method: "PATCH",
    json: { campos },
  });

export function crearListaApi(nombre) {
  return {
    crear: (valores) =>
      request(`${base}/${nombre}`, { method: "POST", json: valores }).then((data) => data.items),
    actualizar: (id, valores) =>
      request(`${base}/${nombre}/${id}`, { method: "PATCH", json: valores }).then(
        (data) => data.items,
      ),
    eliminar: (id) =>
      request(`${base}/${nombre}/${id}`, { method: "DELETE" }).then((data) => data.items),
    reordenar: (ids) =>
      request(`${base}/${nombre}`, { method: "PATCH", json: { ids } }).then((data) => data.items),
  };
}

export const valoresApi = crearListaApi("valores");
export const integrantesApi = crearListaApi("integrantes");

export const subirFotoIntegrante = (idIntegrante, file) => {
  const form = new FormData();

  form.set("file", file);

  return request(`${base}/integrantes/${idIntegrante}/imagen`, { method: "POST", form }).then(
    (data) => data.items,
  );
};

/** `idImagen` = imagen de la biblioteca; `null` quita la foto. */
export const asignarFotoIntegrante = (idIntegrante, idImagen) =>
  request(`${base}/integrantes/${idIntegrante}/imagen`, {
    method: "PATCH",
    json: { id_imagen: idImagen },
  }).then((data) => data.items);

export const subirImagenSeccion = (idPagina, codigoSeccion, file, descripcion) => {
  const form = new FormData();

  form.set("file", file);
  if (descripcion) form.set("descripcion", descripcion);

  return request(`${base}/${idPagina}/secciones/${codigoSeccion}/imagenes`, {
    method: "POST",
    form,
  }).then((data) => data.imagenes);
};

export const guardarImagenesSeccion = (idPagina, codigoSeccion, ids) =>
  request(`${base}/${idPagina}/secciones/${codigoSeccion}/imagenes`, {
    method: "PATCH",
    json: { ids },
  }).then((data) => data.imagenes);

export const guardarDescripcionImagen = (idImagen, descripcion) =>
  request(`${base}/imagenes/${idImagen}`, {
    method: "PATCH",
    json: { descripcion_imagen: descripcion },
  }).then((data) => data.imagen);

export const listarBiblioteca = () =>
  request(`${base}/imagenes`).then((data) => data.imagenes);
