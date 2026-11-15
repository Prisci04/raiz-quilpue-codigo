import { jsonError, jsonSuccess } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { finalizarActividadesVencidas } from "@/services/actividades-finalizacion.service";
import { solicitarActualizacionModelo } from "@/services/ml-modelo.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * Respaldo diario (Vercel Cron u otro programador).
 * Auth: Authorization: Bearer <CRON_SECRET> o header x-cron-secret.
 * No depende de que un usuario tenga el sitio abierto.
 */
function cronAutorizado(request) {
  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) {
    return false;
  }
  const auth = request.headers.get("authorization") || "";
  if (auth === `Bearer ${expected}`) {
    return true;
  }
  const header = (request.headers.get("x-cron-secret") || "").trim();
  return header === expected;
}

async function runCron(request) {
  if (!cronAutorizado(request)) {
    return noStore(jsonError(401, "UNAUTHENTICATED", "No autorizado"));
  }

  let finalizacion = { updated: 0, ids: [] };
  try {
    finalizacion = await finalizarActividadesVencidas();
  } catch (error) {
    console.error("[cron/ml-actualizar] finalizacion", error);
  }

  try {
    const actualizacion = await solicitarActualizacionModelo({
      motivo: "cron_diario",
      forzar: false,
    });
    return noStore(
      jsonSuccess({
        finalizadas: finalizacion.updated,
        ...actualizacion,
      }),
    );
  } catch (error) {
    console.error("[cron/ml-actualizar] modelo", error);
    return noStore(
      jsonError(
        Number.isInteger(error.status) ? error.status : 503,
        error.code || "ML_CRON_FAILED",
        error.message || "Falló la actualización programada.",
      ),
    );
  }
}

export async function GET(request) {
  return runCron(request);
}

export async function POST(request) {
  return runCron(request);
}
