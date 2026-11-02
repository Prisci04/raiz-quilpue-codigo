async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function failed(body, status) {
  const error = new Error(body?.error?.message || "No se pudo subir la imagen.");
  error.status = status;
  error.code = body?.error?.code || "REQUEST_FAILED";
  return error;
}

export async function uploadAporteImage(file) {
  const body = new FormData();

  body.set("file", file);
  body.set("contexto", "museo");
  body.set("tipoImagen", "aporte");

  const response = await fetch("/api/admin/media", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const payload = await readJson(response);

  if (!response.ok || !payload?.success || !payload.data?.url) {
    throw failed(payload, response.status);
  }

  return payload.data;
}

export async function uploadPortada(file, registroId, contexto = "contenidos") {
  const body = new FormData();

  body.set("file", file);
  body.set("contexto", contexto);
  body.set("registroId", String(registroId));
  body.set("tipoImagen", "portada");

  const response = await fetch("/api/admin/media", {
    method: "POST",
    body,
    credentials: "same-origin",
  });
  const payload = await readJson(response);

  if (!response.ok || !payload?.success || !payload.data?.url) {
    throw failed(payload, response.status);
  }

  return payload.data;
}

export async function discardUploadedPortada(url) {
  const response = await fetch("/api/admin/media", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const payload = await readJson(response);

  if (!response.ok || !payload?.success) {
    throw failed(payload, response.status);
  }

  return payload.data;
}
