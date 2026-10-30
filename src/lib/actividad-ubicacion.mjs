export const DIRECCION_MAX_LENGTH = 500;
export const CAMPOS_UBICACION = ["direccion", "google_place_id"];
const CONTROL = /[\u0000-\u001f\u007f]/;
const MAPS_URL_MAX_LENGTH = 2048;

export function normalizeLocationText(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

// Omitted fields stay omitted. An explicit null/blank clears just that field.
export function parseActividadUbicacion(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "La ubicación no es válida." };
  const value = {};
  for (const field of CAMPOS_UBICACION) {
    if (!Object.hasOwn(input, field)) continue;
    const raw = input[field];
    if (raw !== null && typeof raw !== "string") {
      return { ok: false, message: field === "direccion" ? "La dirección no es válida." : "La referencia de Google Maps no es válida." };
    }
    const normalized = normalizeLocationText(raw);
    if (normalized && (CONTROL.test(normalized) || (field === "direccion" && normalized.length > DIRECCION_MAX_LENGTH))) {
      return { ok: false, message: field === "direccion" ? "La dirección no es válida o supera los 500 caracteres." : "La referencia de Google Maps no es válida." };
    }
    value[field] = normalized;
  }
  return { ok: true, value };
}

export function googleMapsKey(value) {
  const key = normalizeLocationText(value);
  return key && !/^(YOUR_|TU_|REPLACE_|PLACEHOLDER)/i.test(key) ? key : null;
}

export function actividadTieneUbicacionFisica(activity) {
  return activity?.modalidad === "presencial" || activity?.modalidad === "hibrida";
}

export function puedeMostrarMapa(activity, apiKey) {
  return Boolean(actividadTieneUbicacionFisica(activity)
    && normalizeLocationText(activity.google_place_id) && googleMapsKey(apiKey));
}

// Shared by administrative preview and public details. Credentials do not alter the model.
export function googleMapsRenderer(activity, { mapsKey, embedKey } = {}) {
  if (!actividadTieneUbicacionFisica(activity) || !normalizeLocationText(activity.google_place_id)) return null;
  if (buildGoogleMapsEmbedUrl(activity.google_place_id, embedKey)) return "embed";
  return googleMapsKey(mapsKey) ? "javascript" : null;
}

function mapsUrl(path, params) {
  const url = new URL(path, "https://www.google.com");
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.href.length <= MAPS_URL_MAX_LENGTH ? url.href : null;
}

export function buildGoogleMapsEmbedUrl(placeId, apiKey) {
  const id = normalizeLocationText(placeId);
  const key = googleMapsKey(apiKey);
  if (!id || !key) return null;
  return mapsUrl("/maps/embed/v1/place", { key, q: "place_id:" + id, language: "es", region: "CL" });
}

export function buildActividadMapsLinks(activity) {
  if (!actividadTieneUbicacionFisica(activity)) return { directions: null, map: null };
  const id = normalizeLocationText(activity.google_place_id);
  const label = normalizeLocationText(activity.direccion) || normalizeLocationText(activity.lugar);
  // Maps URLs requires a textual destination/query even when supplying a Place ID.
  const destination = label || (id ? "Ubicación de la actividad" : null);
  if (!destination) return { directions: null, map: null };
  const directions = mapsUrl("/maps/dir/", { api: "1", destination, destination_place_id: id });
  const map = mapsUrl("/maps/search/", { api: "1", query: destination, query_place_id: id });
  // A long opaque identifier must not create an invalid URL or be truncated.
  return {
    directions: directions || (label ? mapsUrl("/maps/dir/", { api: "1", destination: label }) : null),
    map: map || (label ? mapsUrl("/maps/search/", { api: "1", query: label }) : null),
  };
}

export class ActividadUbicacionSchemaError extends Error {
  constructor() {
    super("La ubicación adicional todavía no está habilitada para guardarse. Conserva los datos del formulario y solicita habilitarla antes de volver a guardar.");
    this.status = 503;
    this.code = "ACTIVIDAD_UBICACION_UNAVAILABLE";
  }
}
