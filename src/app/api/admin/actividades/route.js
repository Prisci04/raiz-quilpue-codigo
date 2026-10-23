import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseActividadInput } from "@/lib/community-validation.mjs";
import { parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import { listActividadesAdmin, saveActividadAdmin } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return runAdminCommunity(request, "GET /api/admin/actividades", async () =>
    jsonSuccess(await listActividadesAdmin()),
  );
}

export async function POST(request) {
  return runAdminCommunity(request, "POST /api/admin/actividades", async () => {
    const parsed = parseActividadInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(400, "VALIDATION", parsed.message);
    if (parsed.value.imagen_url && parseOwnedPortadaUrl(parsed.value.imagen_url)) {
      return jsonError(400, "VALIDATION", "Sube la imagen después de crear la actividad.");
    }
    return jsonSuccess(await saveActividadAdmin(null, parsed.value), {}, 201);
  });
}
