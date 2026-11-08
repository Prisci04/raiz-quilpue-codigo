import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { parseLoginBody, readJsonObject } from "@/lib/auth/credentials";
import { loginAllowed } from "@/lib/auth/policy";
import { verifyPassword } from "@/lib/auth/password";
import { isTrustedOrigin } from "@/lib/auth/origin";
import { createSession } from "@/lib/auth/session";
import { toPublicUser } from "@/lib/auth/user";
import { findUsuarioByEmail } from "@/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "La solicitud no es válida.";
const CREDENTIALS_MESSAGE = "Correo o contraseña incorrectos.";

// Pendiente antes de producción: rate limiting distribuido (WAF, edge o
// almacén compartido). Un Map en memoria no protege entre instancias serverless.

function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request) {
  try {
    if (!isTrustedOrigin(request)) {
      return noStore(jsonError(403, "FORBIDDEN_ORIGIN", "Origen no permitido"));
    }

    const body = await readJsonObject(request);

    if (!body.ok) {
      return noStore(jsonError(400, "INVALID_REQUEST", INVALID_MESSAGE));
    }

    const credentials = parseLoginBody(body.value);

    if (!credentials.ok) {
      return noStore(jsonError(400, "INVALID_REQUEST", INVALID_MESSAGE));
    }

    const user = await findUsuarioByEmail(credentials.email);
    const passwordOk = await verifyPassword(
      credentials.password,
      user?.password,
    );

    if (!loginAllowed(user, passwordOk)) {
      return noStore(
        jsonError(401, "INVALID_CREDENTIALS", CREDENTIALS_MESSAGE),
      );
    }

    await createSession(user.id, user.password);

    return noStore(jsonSuccess(toPublicUser(user)));
  } catch {
    logInternalError("POST /api/auth/login");
    return noStore(
      jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "No fue posible procesar la solicitud",
      ),
    );
  }
}
