import { jsonSuccess } from "@/lib/http";
import { requireInternalSession } from "@/lib/auth/guard";
import { getCurrentTokenHash } from "@/lib/auth/session";
import {
  noStore,
  readUsuarioBody,
  respondUsuarioFailure,
} from "@/lib/usuarios/respond";
import { changePasswordActual } from "@/services/perfil.service";
import { parsePasswordChange } from "@/lib/usuarios/validation.mjs";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request) {
  try {
    const auth = await requireInternalSession(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const body = await readUsuarioBody(request);
    const parsed = parsePasswordChange(body);

    if (!parsed.ok) {
      throw new UsuarioError("VALIDATION", parsed.message);
    }

    const tokenHash = await getCurrentTokenHash();
    const result = await changePasswordActual(
      auth.user.id,
      parsed.value,
      tokenHash,
    );

    return noStore(jsonSuccess(result));
  } catch (error) {
    return respondUsuarioFailure(error, "PATCH /api/admin/perfil/password");
  }
}
