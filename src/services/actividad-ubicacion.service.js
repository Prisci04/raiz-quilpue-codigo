import "server-only";
import { ActividadUbicacionSchemaError, CAMPOS_UBICACION } from "@/lib/actividad-ubicacion.mjs";

export const ACTIVIDAD_UBICACION_COLUMNS = ",direccion,google_place_id";

function missingLocationColumn(error) {
  return ["42703", "PGRST204"].includes(error?.code)
    && /\b(direccion|google_place_id)\b/i.test(error.message ?? "");
}

export async function readActividadUbicacion(query) {
  const result = await query(true);
  return missingLocationColumn(result.error) ? query(false) : result;
}

export async function writeActividadUbicacion(query, input) {
  const result = await query(true, input);
  if (!missingLocationColumn(result.error)) return result;
  if (CAMPOS_UBICACION.some((field) => input[field] != null)) throw new ActividadUbicacionSchemaError();
  const legacy = Object.fromEntries(Object.entries(input).filter(([key]) => !CAMPOS_UBICACION.includes(key)));
  return query(false, legacy);
}
