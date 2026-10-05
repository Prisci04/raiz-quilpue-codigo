import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { noStore, readContenidoBody } from "@/lib/contenidos/respond";
import { parsePositiveInteger } from "@/lib/http";
import { parseInscripcionInput } from "@/lib/community-validation.mjs";
import { crearInscripcion } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const parsedId = parsePositiveInteger(id, { min: 1 });
    if (!parsedId.ok) return noStore(jsonError(400, "VALIDATION", "La actividad no es válida."));
    const input = parseInscripcionInput(await readContenidoBody(request));
    if (!input) return noStore(jsonError(400, "VALIDATION", "Revisa los datos de inscripción."));
    const result = await crearInscripcion(parsedId.value, input);
    if (result.error === "NO_PLACES") {
      return noStore(jsonError(409, "NO_PLACES", "No quedan cupos disponibles."));
    }
    if (result.error) {
      return noStore(jsonError(404, "ACTIVITY_UNAVAILABLE", "La actividad no acepta inscripciones."));
    }
    return noStore(jsonSuccess({ inscrito: true }, {}, 201));
  } catch {
    logInternalError("POST /api/actividades/[id]/inscripciones");
    return noStore(jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible registrar la inscripción."));
  }
}
