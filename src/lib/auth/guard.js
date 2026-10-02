import "server-only";

import { isMutatingMethod, isTrustedOrigin } from "@/lib/auth/origin";
import { validateSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function requireInternalSession(request) {
  const result = await validateSession();

  if (!result) {
    return {
      user: null,
      response: jsonError(401, "UNAUTHENTICATED", "No autenticado"),
    };
  }

  if (result.forbidden) {
    return {
      user: null,
      response: jsonError(403, "FORBIDDEN", "No autorizado"),
    };
  }

  if (isMutatingMethod(request.method) && !isTrustedOrigin(request)) {
    return {
      user: null,
      response: jsonError(403, "FORBIDDEN_ORIGIN", "Origen no permitido"),
    };
  }

  return { user: result.user, response: null };
}
