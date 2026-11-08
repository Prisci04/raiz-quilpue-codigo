async function requestJson(path) {
  const response = await fetch(path, {
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
    const error = new Error(
      body?.error?.message || "No fue posible cargar los catálogos.",
    );
    error.status = response.status;
    throw error;
  }

  return body.data;
}

export function getCatalogos(nombres) {
  const query = nombres?.length ? `?nombres=${nombres.join(",")}` : "";
  return requestJson(`/api/catalogos${query}`);
}
