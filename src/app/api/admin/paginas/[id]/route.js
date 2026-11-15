import { jsonError, jsonSuccess } from "@/lib/http";
import { runPaginasAdmin } from "@/lib/paginas/http";
import { parsePaginaId } from "@/lib/paginas/validation.mjs";
import { getPaginaEdicion } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  return runPaginasAdmin(request, "GET /api/admin/paginas/[id]", async () => {
    const idPagina = parsePaginaId((await params).id);
    const pagina = await getPaginaEdicion(idPagina);

    return pagina
      ? jsonSuccess(pagina)
      : jsonError(404, "NOT_FOUND", "Página no encontrada.");
  });
}
