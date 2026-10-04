import "server-only";

import { ContenidoError } from "@/lib/contenidos/errors.mjs";
import { jsonError, logInternalError } from "@/lib/http";

const BODY_MAX_LENGTH = 200000;

const STATUS_BY_CODE = {
  VALIDATION: 400,
  NOT_FOUND: 404,
};

export function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function readContenidoBody(request) {
  let text;

  try {
    text = await request.text();
  } catch {
    return null;
  }

  if (!text || text.length > BODY_MAX_LENGTH) {
    return null;
  }

  try {
    const value = JSON.parse(text);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

export function respondContenidoFailure(error, context) {
  if (error instanceof ContenidoError) {
    return noStore(
      jsonError(STATUS_BY_CODE[error.code] ?? 400, error.code, error.message),
    );
  }

  logInternalError(context);

  if (error?.code) {
    console.error(`[${context}] ${error.code}`);
  }

  return noStore(
    jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible procesar la solicitud"),
  );
}
