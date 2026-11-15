import { jsonError, jsonSuccess } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { requireAdministrador } from "@/lib/auth/guard";
import { solicitarActualizacionModelo } from "@/services/ml-modelo.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request) {
  const auth = await requireAdministrador(request);
  if (auth.response) {
    return noStore(auth.response);
  }

  try {
    const data = await solicitarActualizacionModelo({
      motivo: "estadisticas_manual",
      forzar: false,
    });
    return noStore(jsonSuccess(data));
  } catch (error) {
    console.error("[admin/ml/actualizar]", error);
    return noStore(
      jsonError(
        Number.isInteger(error.status) ? error.status : 503,
        error.code || "ML_UPDATE_FAILED",
        error.message || "No se pudo actualizar las estimaciones.",
      ),
    );
  }
}
