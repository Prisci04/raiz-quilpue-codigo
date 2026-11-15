import { jsonError, jsonSuccess } from "@/lib/http";
import { parseEstimacionPayload } from "@/lib/ml/estimacion.mjs";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { solicitarEstimacionInscripciones } from "@/services/ml-inferencia.service";

export async function POST(request) {
  return runAdminCommunity(request, "actividades/estimacion", async () => {
    const body = await readJsonBody(request);
    if (!body) {
      return jsonError(400, "VALIDATION", "Solicitud inválida.");
    }

    const parsed = parseEstimacionPayload(body);
    if (!parsed.ok) {
      return jsonError(400, "VALIDATION", parsed.error);
    }

    try {
      const data = await solicitarEstimacionInscripciones(parsed.value);
      return jsonSuccess(data);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 503;
      return jsonError(
        status,
        error.code || "ML_UNAVAILABLE",
        error.message || "No fue posible calcular la estimación.",
      );
    }
  });
}
