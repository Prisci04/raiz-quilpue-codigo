import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { requireInternalSession } from "@/lib/auth/guard";

// Esta ruta solo comprueba la sesión. Las rutas de gestión deben exigir
// requireGestorContenido o requireAdministrador según el recurso.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request) {
  try {
    const auth = await requireInternalSession(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    return noStore(jsonSuccess({ ok: true }));
  } catch {
    logInternalError("GET /api/admin");
    return noStore(
      jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "No fue posible procesar la solicitud",
      ),
    );
  }
}
