import "server-only";
import { ActividadUbicacionSchemaError, CAMPOS_UBICACION } from "@/lib/actividad-ubicacion.mjs";

export const ACTIVIDAD_UBICACION_COLUMNS = "," + CAMPOS_UBICACION.join(",");
export function actividadUbicacionColumns(fields) {
  return Array.isArray(fields) ? fields.length ? "," + fields.join(",") : "" : fields ? ACTIVIDAD_UBICACION_COLUMNS : "";
}

function missingFields(error, fields) {
  if (!["42703", "PGRST204"].includes(error?.code)) return [];
  const field = (error.message ?? "").match(/\b(direccion|google_place_id|latitud|longitud)\b/i)?.[1]?.toLowerCase();
  if (!fields.includes(field)) return [];
  return field === "latitud" || field === "longitud" ? ["latitud", "longitud"] : [field];
}

export async function readActividadUbicacion(query) {
  let fields = [...CAMPOS_UBICACION];
  for (;;) {
    const result = await query(fields);
    const missing = missingFields(result.error, fields);
    if (!missing.length) return result;
    fields = fields.filter((field) => !missing.includes(field));
  }
}

export async function writeActividadUbicacion(query, input) {
  let fields = [...CAMPOS_UBICACION], payload = { ...input };
  for (;;) {
    const result = await query(fields, payload);
    const missing = missingFields(result.error, fields);
    if (!missing.length) return result;
    // A failed statement wrote nothing. Never silently discard new nonnull data.
    if (missing.some((field) => payload[field] != null)) throw new ActividadUbicacionSchemaError();
    fields = fields.filter((field) => !missing.includes(field));
    payload = Object.fromEntries(Object.entries(payload).filter(([field]) => !missing.includes(field)));
  }
}
