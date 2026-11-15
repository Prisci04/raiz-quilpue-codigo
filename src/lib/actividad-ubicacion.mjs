export const DIRECCION_MAX_LENGTH = 500;
export const CAMPOS_UBICACION = ["direccion", "google_place_id", "latitud", "longitud"];
const CONTROL = /[\u0000-\u001f\u007f]/;
const MAPS_URL_MAX_LENGTH = 2048;

export function normalizeLocationText(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

// Omitted fields stay omitted. An explicit null/blank clears just that field.
export function parseActividadUbicacion(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "La ubicación no es válida." };
  const value = {};
  for (const field of ["direccion", "google_place_id"]) {
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
  const hasCoordinates = Object.hasOwn(input, "latitud") || Object.hasOwn(input, "longitud");
  if (hasCoordinates) {
    const latitud = input.latitud ?? null;
    const longitud = input.longitud ?? null;
    if (latitud === null && longitud === null) Object.assign(value, { latitud: null, longitud: null });
    else if (coordenadasValidas(latitud, longitud)) Object.assign(value, { latitud, longitud });
    else return { ok: false, message: "Indica ambas coordenadas válidas: latitud entre -90 y 90, longitud entre -180 y 180." };
  }
  return { ok: true, value };
}

export function coordenadasValidas(latitud, longitud) {
  return typeof latitud === "number" && Number.isFinite(latitud) && latitud >= -90 && latitud <= 90
    && typeof longitud === "number" && Number.isFinite(longitud) && longitud >= -180 && longitud <= 180;
}

// A single explicit null clears the pair; a partial numeric PATCH preserves its partner.
export function coordinatePatch(input) {
  if ((input.latitud === null && !Object.hasOwn(input, "longitud"))
    || (input.longitud === null && !Object.hasOwn(input, "latitud"))) {
    return { ...input, latitud: null, longitud: null };
  }
  return input;
}

export function actividadTieneUbicacionFisica(activity) {
  const modalidad = String(activity?.modalidad ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return modalidad === "presencial" || modalidad === "hibrida";
}

export function puedeMostrarMapa(activity) {
  return Boolean(actividadTieneUbicacionFisica(activity)
    && coordenadasValidas(activity.latitud, activity.longitud));
}

function mapsUrl(path, params) {
  const url = new URL(path, "https://www.google.com");
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.href.length <= MAPS_URL_MAX_LENGTH ? url.href : null;
}

export function buildActividadMapsLinks(activity) {
  if (!actividadTieneUbicacionFisica(activity)) return { directions: null, map: null };
  const label = normalizeLocationText(activity.direccion) || normalizeLocationText(activity.lugar);
  const destination = coordenadasValidas(activity.latitud, activity.longitud)
    ? `${activity.latitud},${activity.longitud}` : label;
  if (!destination) return { directions: null, map: null };
  const directions = mapsUrl("/maps/dir/", { api: "1", destination });
  const map = mapsUrl("/maps/search/", { api: "1", query: destination });
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
