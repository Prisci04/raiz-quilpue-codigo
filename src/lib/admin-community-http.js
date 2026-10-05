import "server-only";

import { jsonError, logInternalError } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { requireGestorContenido } from "@/lib/auth/guard";

export async function runAdminCommunity(request, context, operation) {
  try {
    const auth = await requireGestorContenido(request);
    if (auth.response) return noStore(auth.response);
    return noStore(await operation());
  } catch (error) {
    logInternalError(context);
    return noStore(
      jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible procesar la solicitud"),
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
  if (!text || text.length > 50000) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
