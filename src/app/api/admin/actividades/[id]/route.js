import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseActividadEstado, parseActividadInput } from "@/lib/community-validation.mjs";
import { parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import {
  deleteActividadAdmin,
  getActividadAdmin,
  saveActividadAdmin,
  saveActividadEstadoAdmin,
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
    const soloEstado = Boolean(body) && Object.keys(body).length === 1 && "estado" in body;
    if (soloEstado) {
      const input = parseActividadEstado(body);
      if (!input.ok) return jsonError(400, "VALIDATION", input.message);
      const saved = await saveActividadEstadoAdmin(parsed.value, input.value.estado);
      return saved
        ? jsonSuccess(saved)
        : jsonError(404, "NOT_FOUND", "Actividad no encontrada.");
    }

    const current = await getActividadAdmin(parsed.value);
    if (!current) return jsonError(404, "NOT_FOUND", "Actividad no encontrada.");

    const sameImage = body.imagen_url === current.imagen_url;
    const input = parseActividadInput(sameImage ? { ...body, imagen_url: null } : body);
    if (!input.ok) return jsonError(400, "VALIDATION", input.message);
    if (sameImage) {
      input.value.imagen_url = current.imagen_url;
    } else if (input.value.imagen_url) {
      const owned = parseOwnedPortadaUrl(input.value.imagen_url);
      if (!owned || owned.contexto !== "actividades" || owned.registroId !== parsed.value) {
        return jsonError(400, "VALIDATION", "La imagen de la actividad no es válida.");
      }
    }

    const saved = await saveActividadAdmin(parsed.value, input.value);
    return saved
      ? jsonSuccess(saved)
      : jsonError(404, "NOT_FOUND", "Actividad no encontrada.");
  });
}

export async function DELETE(request, { params }) {
  return runAdminCommunity(request, "DELETE /api/admin/actividades/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const deleted = await deleteActividadAdmin(parsed.value);
    return deleted
      ? jsonSuccess({ eliminado: true })
      : jsonError(404, "NOT_FOUND", "Actividad no encontrada.");
  });
}
