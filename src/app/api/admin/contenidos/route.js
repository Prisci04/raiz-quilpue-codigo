import { jsonSuccess } from "@/lib/http";
import { requireGestorContenido } from "@/lib/auth/guard";
import { ContenidoError } from "@/lib/contenidos/errors.mjs";
import {
  noStore,
  readContenidoBody,
  respondContenidoFailure,
} from "@/lib/contenidos/respond";
import { parseCreateContenido } from "@/lib/contenidos/validation.mjs";
import { listCatalogosContenido } from "@/services/catalogos.service";
import { crearContenido } from "@/services/contenidos-admin.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const auth = await requireGestorContenido(request);

    if (auth.response) {
      return noStore(auth.response);
    }

    const catalogos = await listCatalogosContenido();
    const body = await readContenidoBody(request);
    const parsed = parseCreateContenido(body, catalogos);

    if (!parsed.ok) {
      throw new ContenidoError("VALIDATION", parsed.message);
    }

    const contenido = await crearContenido(parsed.value, auth.user.id, catalogos);
    return noStore(jsonSuccess(contenido, {}, 201));
  } catch (error) {
    return respondContenidoFailure(error, "POST /api/admin/contenidos");
  }
}
