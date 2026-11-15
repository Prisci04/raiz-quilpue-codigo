import { jsonError, jsonSuccess } from "@/lib/http";
import { noStore } from "@/lib/contenidos/respond";
import { requireAdministrador } from "@/lib/auth/guard";
import { obtenerEstadoModelo } from "@/services/ml-modelo.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAdministrador(request);
  if (auth.response) {
    return noStore(auth.response);
  }

  try {
    const data = await obtenerEstadoModelo();
    return noStore(jsonSuccess(data));
  } catch (error) {
    console.error("[admin/ml/estado]", error);
    return noStore(
      jsonError(
        Number.isInteger(error.status) ? error.status : 503,
        error.code || "ML_UNAVAILABLE",
        error.message || "No se pudo consultar el estado de las estimaciones.",
      ),
    );
  }
}
