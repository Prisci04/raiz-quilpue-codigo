import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { validateSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  try {
    const result = await validateSession();

    if (!result) {
      return noStore(jsonError(401, "UNAUTHENTICATED", "No autenticado"));
    }

    if (result.forbidden) {
      return noStore(jsonError(403, "FORBIDDEN", "No autorizado"));
    }

    return noStore(jsonSuccess(result.user));
  } catch {
    logInternalError("GET /api/auth/me");
    return noStore(
      jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "No fue posible procesar la solicitud",
      ),
    );
  }
}
