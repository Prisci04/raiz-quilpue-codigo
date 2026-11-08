import "server-only";

import { jsonError } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { requireGestorContenido } from "@/lib/auth/guard";
import { ActividadUbicacionSchemaError } from "@/lib/actividad-ubicacion.mjs";

export async function runAdminCommunity(request, context, operation) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    return noStore(await operation(auth.user));
  } catch (error) {
    if (error instanceof ActividadUbicacionSchemaError) {
      return noStore(jsonError(error.status, error.code, error.message));
    }
    console.error(`[${context}]`, error);

    return noStore(
      jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "No fue posible procesar la solicitud",
      ),
    );
  }
}

export async function readJsonBody(request) {
  let text;

  try {
    text = await request.text();
  } catch {
    return null;
  }

  if (!text || text.length > 50000) {
    return null;
  }

  try {
    const value = JSON.parse(text);

    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}
