import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity } from "@/lib/admin-community-http";
import { listParticipantesAdmin } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  return runAdminCommunity(request, "GET /api/admin/actividades/[id]/participantes", async () => {
    const { id } = await params;
    const parsed = parsePositiveInteger(id, { min: 1 });
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    return jsonSuccess(await listParticipantesAdmin(parsed.value));
  });
}
