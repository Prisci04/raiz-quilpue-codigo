import "server-only";

import { isMutatingMethod, isTrustedOrigin } from "@/lib/auth/origin";
import { validateSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { usuarioEsGestorContenido, usuarioTieneRol } from "@/services/usuarios.service";

export async function requireInternalSession(request) {
  const result = await validateSession(request);

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

export async function requireAdministrador(request) {
  const auth = await requireInternalSession(request);

  if (auth.response) {
    return auth;
  }

  const isAdmin = await usuarioTieneRol(auth.user.id, "administrador");

  if (!isAdmin) {
    return {
      user: null,
      response: jsonError(403, "FORBIDDEN", "No autorizado"),
    };
  }

  return auth;
}

export async function requireGestorContenido(request) {
  const auth = await requireInternalSession(request);

  if (auth.response) {
    return auth;
  }

  const isGestor = await usuarioEsGestorContenido(auth.user.id);

  if (!isGestor) {
    return {
      user: null,
      response: jsonError(403, "FORBIDDEN", "No autorizado"),
    };
  }

  return auth;
}
