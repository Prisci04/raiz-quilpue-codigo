import { requireJsonBody, respuestaOk, runPaginasAdmin } from "@/lib/paginas/http";
import { parseIntegranteInput, parseOrdenPayload } from "@/lib/paginas/validation.mjs";
import { crearIntegrante, reordenarIntegrantes } from "@/services/paginas.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  return runPaginasAdmin(request, "POST /api/admin/paginas/integrantes", async () => {
    const input = parseIntegranteInput(await requireJsonBody(request));

    return respuestaOk({ items: await crearIntegrante(input) }, 201);
  });
}

/** Reordena el directorio: recibe la lista completa de ids en el orden deseado. */
export async function PATCH(request) {
  return runPaginasAdmin(request, "PATCH /api/admin/paginas/integrantes", async () => {
    const ids = parseOrdenPayload(await requireJsonBody(request));

    return respuestaOk({ items: await reordenarIntegrantes(ids) });
  });
}
