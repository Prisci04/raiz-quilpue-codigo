import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { noStore, readContenidoBody } from "@/lib/contenidos/respond";
import { parseAporteMuseoInput } from "@/lib/community-validation.mjs";
import { createAporteMuseo } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const input = parseAporteMuseoInput(await readContenidoBody(request));
    if (!input) return noStore(jsonError(400, "VALIDATION", "Revisa los campos obligatorios del aporte."));
    await createAporteMuseo(input);
    return noStore(jsonSuccess({ recibido: true }, {}, 201));
  } catch {
    logInternalError("POST /api/museo/aportes");
    return noStore(jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible recibir el aporte."));
  }
}
