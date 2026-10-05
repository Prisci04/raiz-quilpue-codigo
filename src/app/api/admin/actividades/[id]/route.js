import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseActividadInput } from "@/lib/community-validation.mjs";
import {
  deleteActividadAdmin,
  getActividadAdmin,
  saveActividadAdmin,
} from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

async function parseId(params) {
  const { id } = await params;
  return parsePositiveInteger(id, { min: 1 });
}

export async function GET(request, { params }) {
  return runAdminCommunity(request, "GET /api/admin/actividades/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const activity = await getActividadAdmin(parsed.value);
    return activity
      ? jsonSuccess(activity)
      : jsonError(404, "NOT_FOUND", "Actividad no encontrada.");
  });
}

export async function PATCH(request, { params }) {
  return runAdminCommunity(request, "PATCH /api/admin/actividades/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const body = await readJsonBody(request);
    const input = parseActividadInput(body);
    if (!input) return jsonError(400, "VALIDATION", "Revisa los datos de la actividad.");
    return jsonSuccess(await saveActividadAdmin(parsed.value, input));
  });
}

export async function DELETE(request, { params }) {
  return runAdminCommunity(request, "DELETE /api/admin/actividades/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    await deleteActividadAdmin(parsed.value);
    return jsonSuccess({ eliminado: true });
  });
}
