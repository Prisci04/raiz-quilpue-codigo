import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import {
  parseCamposPayload,
  parsePaginaId,
  parseSeccionCodigo,
} from "@/lib/paginas/validation.mjs";
import { updateCamposSeccion } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

/** Actualiza el `valor` de campos ya existentes de una sección. */
export async function PATCH(request, { params }) {
  return runPaginasAdmin(
    request,
    "PATCH /api/admin/paginas/[id]/secciones/[codigo]",
    async () => {
      const { id, codigo } = await params;
      const idPagina = parsePaginaId(id);
      const seccion = parseSeccionCodigo(idPagina, codigo);
      const campos = parseCamposPayload(idPagina, seccion, await requireJsonBody(request));

      return respuestaOk({ campos: await updateCamposSeccion(idPagina, seccion, campos) });
    },
  );
}
