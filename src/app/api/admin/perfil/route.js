import { jsonSuccess } from "@/lib/http";
import { requireInternalSession } from "@/lib/auth/guard";
import {
  noStore,
  readUsuarioBody,
  respondUsuarioFailure,
} from "@/lib/usuarios/respond";
import { getPerfilActual, updatePerfilActual } from "@/services/perfil.service";
import { parsePerfilUpdate } from "@/lib/usuarios/validation.mjs";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireInternalSession(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const perfil = await getPerfilActual(auth.user.id);
    return noStore(jsonSuccess(perfil));
  } catch (error) {
    return respondUsuarioFailure(error, "GET /api/admin/perfil");
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireInternalSession(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const body = await readUsuarioBody(request);
    const parsed = parsePerfilUpdate(body);

    if (!parsed.ok) {
      throw new UsuarioError("VALIDATION", parsed.message);
    }

    const perfil = await updatePerfilActual(auth.user.id, parsed.value);
    return noStore(jsonSuccess(perfil));
  } catch (error) {
    return respondUsuarioFailure(error, "PATCH /api/admin/perfil");
  }
}
