import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import { parseOrdenPayload, parseValorInput } from "@/lib/paginas/validation.mjs";
import { crearValor, reordenarValores } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return runPaginasAdmin(request, "POST /api/admin/paginas/valores", async () => {
    const input = parseValorInput(await requireJsonBody(request));

    return respuestaOk({ items: await crearValor(input) }, 201);
  });
}

/** Reordena los valores: recibe la lista completa de ids en el orden deseado. */
export async function PATCH(request) {
  return runPaginasAdmin(request, "PATCH /api/admin/paginas/valores", async () => {
    const ids = parseOrdenPayload(await requireJsonBody(request));

    return respuestaOk({ items: await reordenarValores(ids) });
  });
}
