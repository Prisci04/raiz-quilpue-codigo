import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { isTrustedOrigin } from "@/lib/auth/origin";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request) {
  try {
    if (!isTrustedOrigin(request)) {
      return noStore(jsonError(403, "FORBIDDEN_ORIGIN", "Origen no permitido"));
    }

    await destroySession();
    return noStore(jsonSuccess({ ok: true }));
  } catch {
    logInternalError("POST /api/auth/logout");
    return noStore(
      jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "No fue posible procesar la solicitud",
      ),
    );
  }
}
