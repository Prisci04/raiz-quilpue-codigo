import { normalizeGeocodingQuery } from "../maps/openstreetmap.mjs";

export async function buscarUbicacion(query, { signal } = {}) {
  const normalized = normalizeGeocodingQuery(query);
  if (!normalized) throw new Error("Escribe una búsqueda de entre 3 y 300 caracteres.");
  const response = await fetch("/api/admin/actividades/ubicacion", {
    method: "POST", credentials: "same-origin", signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query: normalized }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !Array.isArray(body.data)) throw new Error(body?.error?.message || "No fue posible buscar la ubicación.");
  return body.data;
}
