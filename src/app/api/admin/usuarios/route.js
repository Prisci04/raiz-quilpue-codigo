import { jsonSuccess } from "@/lib/http";
import { requireAdministrador } from "@/lib/auth/guard";
import {
  noStore,
  readUsuarioBody,
  respondUsuarioFailure,
} from "@/lib/usuarios/respond";
import {
  createUsuarioInterno,
  listUsuariosInternos,
} from "@/services/usuarios.service";
import { parseCreateUsuario } from "@/lib/usuarios/validation.mjs";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireAdministrador(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const data = await listUsuariosInternos();
    return noStore(jsonSuccess(data));
  } catch (error) {
    return respondUsuarioFailure(error, "GET /api/admin/usuarios");
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdministrador(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const body = await readUsuarioBody(request);
    const parsed = parseCreateUsuario(body);

    if (!parsed.ok) {
      throw new UsuarioError("VALIDATION", parsed.message);
    }

    const usuario = await createUsuarioInterno(parsed.value);
    return noStore(jsonSuccess(usuario, {}, 201));
  } catch (error) {
    return respondUsuarioFailure(error, "POST /api/admin/usuarios");
  }
}
