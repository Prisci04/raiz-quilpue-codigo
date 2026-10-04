import { jsonSuccess } from "@/lib/http";
import { requireInternalSession } from "@/lib/auth/guard";
import { getCurrentTokenHash } from "@/lib/auth/session";
import { noStore, respondUsuarioFailure } from "@/lib/usuarios/respond";
import { closeOtrasSesiones } from "@/services/perfil.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request) {
  try {
    const auth = await requireInternalSession(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const tokenHash = await getCurrentTokenHash();
    const result = await closeOtrasSesiones(auth.user.id, tokenHash);
    return noStore(jsonSuccess(result));
  } catch (error) {
    return respondUsuarioFailure(error, "DELETE /api/admin/perfil/sesiones");
  }
}
