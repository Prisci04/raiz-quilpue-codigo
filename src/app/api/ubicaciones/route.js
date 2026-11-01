import { jsonError, jsonSuccess, logInternalError, parsePositiveInteger } from "@/lib/http";
import {
  getUbicacionesDefault,
  listComunas,
  listLugares,
} from "@/services/lugares.service";

export const dynamic = "force-dynamic";

function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function readOptionalId(raw) {
  if (raw === null || raw === "") {
    return { ok: true, value: null };
  }

  return parsePositiveInteger(raw, { min: 1 });
}

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const regionParsed = readOptionalId(searchParams.get("id_region"));
    const comunaParsed = readOptionalId(searchParams.get("id_comuna"));

    if (!regionParsed.ok || !comunaParsed.ok) {
      return noStore(jsonError(400, "VALIDATION", "La ubicación solicitada no es válida."));
    }

    const defaults = await getUbicacionesDefault();
    const idRegion = regionParsed.value ?? defaults.id_region;
    const comunas = idRegion
      ? defaults.comunas.filter((comuna) => Number(comuna.id_region) === Number(idRegion))
      : defaults.comunas;
    const idComuna =
      comunaParsed.value ??
      (comunas.some((comuna) => Number(comuna.id) === Number(defaults.id_comuna))
        ? defaults.id_comuna
        : (comunas[0]?.id ?? null));

    const lugares = idComuna ? await listLugares({ idComuna }) : [];

    return noStore(
      jsonSuccess({
        regiones: defaults.regiones,
        comunas: idRegion ? await listComunas(idRegion) : defaults.comunas,
        lugares,
        id_region: idRegion,
        id_comuna: idComuna,
      }),
    );
  } catch {
    logInternalError("GET /api/ubicaciones");
    return noStore(
      jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible cargar las ubicaciones."),
    );
  }
}
