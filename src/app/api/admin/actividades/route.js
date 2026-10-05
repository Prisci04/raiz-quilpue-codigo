import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseActividadInput } from "@/lib/community-validation.mjs";
import { listActividadesAdmin, saveActividadAdmin } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return runAdminCommunity(request, "GET /api/admin/actividades", async () =>
    jsonSuccess(await listActividadesAdmin()),
  );
}

export async function POST(request) {
  return runAdminCommunity(request, "POST /api/admin/actividades", async () => {
    const input = parseActividadInput(await readJsonBody(request));
    if (!input) return jsonError(400, "VALIDATION", "Revisa los datos de la actividad.");
    return jsonSuccess(await saveActividadAdmin(null, input), {}, 201);
  });
}
