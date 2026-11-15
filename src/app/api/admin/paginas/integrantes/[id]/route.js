import { jsonError } from "@/lib/http";
import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import { parseId, parseIntegranteInput } from "@/lib/paginas/validation.mjs";
import { actualizarIntegrante, eliminarIntegrante } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

const NO_ENCONTRADO = "Integrante no encontrado.";

export async function PATCH(request, { params }) {
  return runPaginasAdmin(request, "PATCH /api/admin/paginas/integrantes/[id]", async () => {
    const id = parseId((await params).id, "El integrante");
    const input = parseIntegranteInput(await requireJsonBody(request));
    const items = await actualizarIntegrante(id, input);

    return items ? respuestaOk({ items }) : jsonError(404, "NOT_FOUND", NO_ENCONTRADO);
  });
}

export async function DELETE(request, { params }) {
  return runPaginasAdmin(request, "DELETE /api/admin/paginas/integrantes/[id]", async () => {
    const id = parseId((await params).id, "El integrante");
    const items = await eliminarIntegrante(id);

    return items ? respuestaOk({ items }) : jsonError(404, "NOT_FOUND", NO_ENCONTRADO);
  });
}
