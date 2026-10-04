import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { requireAdministrador } from "@/lib/auth/guard";
import {
  noStore,
  readUsuarioBody,
  respondUsuarioFailure,
} from "@/lib/usuarios/respond";
import {
  deleteUsuarioInterno,
  updateUsuarioInterno,
} from "@/services/usuarios.service";
import { parseUpdateUsuario } from "@/lib/usuarios/validation.mjs";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readId(params) {
  const { id: rawId } = await params;
  return parsePositiveInteger(rawId, { min: 1 });
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdministrador(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const parsedId = await readId(params);

    if (!parsedId.ok) {
      return noStore(
        jsonError(400, "VALIDATION", "El identificador no es válido."),
      );
    }

    const body = await readUsuarioBody(request);
    const parsed = parseUpdateUsuario(body);

    if (!parsed.ok) {
      throw new UsuarioError("VALIDATION", parsed.message);
    }

    const usuario = await updateUsuarioInterno(parsedId.value, parsed.value);
    return noStore(jsonSuccess(usuario));
  } catch (error) {
    return respondUsuarioFailure(error, "PATCH /api/admin/usuarios/[id]");
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdministrador(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const parsedId = await readId(params);

    if (!parsedId.ok) {
      return noStore(
        jsonError(400, "VALIDATION", "El identificador no es válido."),
      );
    }

    const result = await deleteUsuarioInterno(parsedId.value, auth.user.id);
    return noStore(jsonSuccess(result));
  } catch (error) {
    return respondUsuarioFailure(error, "DELETE /api/admin/usuarios/[id]");
  }
}
