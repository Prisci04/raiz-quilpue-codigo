import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { requireAdministrador } from "@/lib/auth/guard";
import {
  noStore,
  readUsuarioBody,
  respondUsuarioFailure,
} from "@/lib/usuarios/respond";
import { setEstadoUsuarioInterno } from "@/services/usuarios.service";
import { parseEstadoUsuario } from "@/lib/usuarios/validation.mjs";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdministrador(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const { id: rawId } = await params;
    const parsedId = parsePositiveInteger(rawId, { min: 1 });

    if (!parsedId.ok) {
      return noStore(
        jsonError(400, "VALIDATION", "El identificador no es válido."),
      );
    }

    const body = await readUsuarioBody(request);
    const parsed = parseEstadoUsuario(body);

    if (!parsed.ok) {
      throw new UsuarioError("VALIDATION", parsed.message);
    }

    const usuario = await setEstadoUsuarioInterno(
      parsedId.value,
      parsed.value,
      auth.user.id,
    );

    return noStore(jsonSuccess(usuario));
  } catch (error) {
    return respondUsuarioFailure(
      error,
      "PATCH /api/admin/usuarios/[id]/estado",
    );
  }
}
