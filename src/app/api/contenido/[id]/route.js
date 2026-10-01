import {
  jsonError,
  jsonSuccess,
  logInternalError,
  parsePositiveInteger,
} from "@/lib/http";
import { getContenidoById } from "@/services/contenido.service";

export async function GET(_request, { params }) {
  try {
    const { id: rawId } = await params;
    const parsedId = parsePositiveInteger(rawId, { min: 1 });

    if (!parsedId.ok) {
      return jsonError(
        400,
        "INVALID_CONTENT_ID",
        "El identificador del contenido no es válido",
      );
    }

    const contenido = await getContenidoById(parsedId.value);

    if (!contenido) {
      return jsonError(404, "CONTENT_NOT_FOUND", "Contenido no encontrado");
    }

    return jsonSuccess(contenido);
  } catch {
    logInternalError("GET /api/contenido/[id]");
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "No fue posible procesar la solicitud",
    );
  }
}
