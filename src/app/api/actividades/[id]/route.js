import {
  jsonError,
  jsonSuccess,
  logInternalError,
  parsePositiveInteger,
} from "@/lib/http";
import { getActividadById } from "@/services/actividades.service";

export async function GET(_request, { params }) {
  try {
    const { id: rawId } = await params;
    const parsedId = parsePositiveInteger(rawId, { min: 1 });

    if (!parsedId.ok) {
      return jsonError(
        400,
        "INVALID_ACTIVITY_ID",
        "El identificador de la actividad no es válido",
      );
    }

    const actividad = await getActividadById(parsedId.value);

    if (!actividad) {
      return jsonError(404, "ACTIVITY_NOT_FOUND", "Actividad no encontrada");
    }

    return jsonSuccess(actividad);
  } catch {
    logInternalError("GET /api/actividades/[id]");
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "No fue posible procesar la solicitud",
    );
  }
}
