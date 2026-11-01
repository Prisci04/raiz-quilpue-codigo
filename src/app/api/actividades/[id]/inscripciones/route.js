import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { noStore, readContenidoBody } from "@/lib/contenidos/respond";
import { parsePositiveInteger } from "@/lib/http";
import { parseInscripcionInput } from "@/lib/community-validation.mjs";
import { crearInscripcion } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

const INSCRIPTION_ERRORS = {
  NO_PLACES: [409, "NO_PLACES", "No quedan cupos ni lugares en lista de espera."],
  INVALID_CONTACT: [400, "VALIDATION", "Revisa el correo y el teléfono. Usa un dominio como .cl o .com y un celular 9 1234 5678."],
  ACTIVITY_ENDED: [409, "ACTIVITY_ENDED", "Las inscripciones de esta actividad ya cerraron."],
  ACTIVITY_UNAVAILABLE: [404, "ACTIVITY_UNAVAILABLE", "La actividad no acepta inscripciones."],
};

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const parsedId = parsePositiveInteger(id, { min: 1 });
    if (!parsedId.ok) return noStore(jsonError(400, "VALIDATION", "La actividad no es válida."));
    const parsed = parseInscripcionInput(await readContenidoBody(request));
    if (!parsed.ok) return noStore(jsonError(400, "VALIDATION", parsed.message));
    const result = await crearInscripcion(parsedId.value, parsed.value);
    if (result.error) {
      const mapped = INSCRIPTION_ERRORS[result.error] ?? INSCRIPTION_ERRORS.ACTIVITY_UNAVAILABLE;
      return noStore(jsonError(...mapped));
    }
    return noStore(jsonSuccess({ inscrito: true, lista_espera: Boolean(result.lista_espera) }, {}, 201));
  } catch {
    logInternalError("POST /api/actividades/[id]/inscripciones");
    return noStore(jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible registrar la inscripción."));
  }
}
