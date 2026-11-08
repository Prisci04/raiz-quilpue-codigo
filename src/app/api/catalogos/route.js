import { jsonError, jsonSuccess, logInternalError } from "@/lib/http";
import { CATALOGO_ACTIVIDAD_NOMBRES, isCatalogoPublico } from "@/lib/catalogos.mjs";
import { listCatalogosPublicos } from "@/services/catalogos.service";

export const dynamic = "force-dynamic";

function noStore(response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function parseNombres(searchParams) {
  const raw = searchParams.get("nombres");

  if (!raw) {
    return { ok: true, value: CATALOGO_ACTIVIDAD_NOMBRES };
  }

  const nombres = [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))];

  if (!nombres.length) {
    return { ok: false };
  }

  if (nombres.some((nombre) => !isCatalogoPublico(nombre))) {
    return { ok: false };
  }

  return { ok: true, value: nombres };
}

export async function GET(request) {
  try {
    const parsed = parseNombres(new URL(request.url).searchParams);

    if (!parsed.ok) {
      return noStore(jsonError(400, "VALIDATION", "El catálogo solicitado no es válido."));
    }

    return noStore(jsonSuccess(await listCatalogosPublicos(parsed.value)));
  } catch (error) {
    if (error?.code === "CATALOG_FORBIDDEN") {
      return noStore(jsonError(400, "VALIDATION", "El catálogo solicitado no es válido."));
    }

    logInternalError("GET /api/catalogos");
    return noStore(
      jsonError(500, "INTERNAL_SERVER_ERROR", "No fue posible cargar los catálogos."),
    );
  }
}
