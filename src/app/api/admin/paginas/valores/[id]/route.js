import { jsonError } from "@/lib/http";
import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import { parseId, parseValorInput } from "@/lib/paginas/validation.mjs";
import { actualizarValor, eliminarValor } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

const NO_ENCONTRADO = "Valor no encontrado.";

export async function PATCH(request, { params }) {
  return runPaginasAdmin(request, "PATCH /api/admin/paginas/valores/[id]", async () => {
    const id = parseId((await params).id, "El valor");
    const input = parseValorInput(await requireJsonBody(request));
    const items = await actualizarValor(id, input);

    return items ? respuestaOk({ items }) : jsonError(404, "NOT_FOUND", NO_ENCONTRADO);
  });
}

export async function DELETE(request, { params }) {
  return runPaginasAdmin(request, "DELETE /api/admin/paginas/valores/[id]", async () => {
    const id = parseId((await params).id, "El valor");
    const items = await eliminarValor(id);

    return items ? respuestaOk({ items }) : jsonError(404, "NOT_FOUND", NO_ENCONTRADO);
  });
}
