import {
  jsonError,
  jsonSuccess,
  logInternalError,
  parsePaginationParams,
} from "@/lib/http";
import { getContenidos } from "@/services/contenido.service";

export async function GET(request) {
  try {
    const pagination = parsePaginationParams(request.nextUrl.searchParams);

    if (!pagination.ok) {
      return jsonError(
        400,
        "INVALID_PAGINATION",
        "Los parámetros de paginación no son válidos",
      );
    }

    const result = await getContenidos({
      page: pagination.page,
      limit: pagination.limit,
    });

    return jsonSuccess(result.data, { pagination: result.pagination });
  } catch {
    logInternalError("GET /api/contenido");
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "No fue posible procesar la solicitud",
    );
  }
}
