import { coordenadasValidas } from "../actividad-ubicacion.mjs";

export const QUILPUE_CENTER = [-33.0472, -71.4425];
export const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
export const GEOCODING_LIMIT = 5;

export function normalizeGeocodingQuery(value) {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  return query.length >= 3 && query.length <= 300 && !/[\u0000-\u001f\u007f]/.test(query) ? query : null;
}

export function parseGeocodingResults(rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid geocoding response");
  const results = [], seen = new Set();
  for (const row of rows.slice(0, 20)) {
    if (!row || typeof row.display_name !== "string" || !row.display_name.trim()
      || !["string", "number"].includes(typeof row.lat) || !["string", "number"].includes(typeof row.lon)
      || String(row.lat).trim() === "" || String(row.lon).trim() === "") continue;
    const latitud = Number(row.lat), longitud = Number(row.lon);
    if (!coordenadasValidas(latitud, longitud)) continue;
    const id = `${latitud},${longitud}`;
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({ id, label: row.display_name.trim().slice(0, 500), latitud, longitud });
    if (results.length === GEOCODING_LIMIT) break;
  }
  return results;
}

export class GeocodingError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
