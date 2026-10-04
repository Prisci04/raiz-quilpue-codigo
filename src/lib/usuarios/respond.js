import "server-only";

import { readJsonObject } from "@/lib/auth/credentials";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";
import { jsonError, logInternalError } from "@/lib/http";

const STATUS_BY_CODE = {
  VALIDATION: 400,
  ROLE_NOT_FOUND: 400,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  MUST_DEACTIVATE: 409,
  LAST_ADMIN: 409,
  SELF_ACTION: 403,
  PASSWORD_ACTUAL: 400,
};

export function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function readUsuarioBody(request) {
  const body = await readJsonObject(request);
  return body.ok ? body.value : null;
}

export function respondUsuarioFailure(error, context) {
  if (error instanceof UsuarioError) {
    return noStore(
      jsonError(
        STATUS_BY_CODE[error.code] ?? 400,
        error.code,
        error.message,
      ),
    );
  }

  logInternalError(context);

  if (error?.code) {
    console.error(`[${context}] ${error.code}`);
  }

  return noStore(
    jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "No fue posible procesar la solicitud",
    ),
  );
}
