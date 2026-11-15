import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseActividadEstado, parseActividadInput } from "@/lib/community-validation.mjs";
import { parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import { coordinatePatch } from "@/lib/actividad-ubicacion.mjs";
import {
  deleteActividadAdmin,
  getActividadAdmin,
  saveActividadAdmin,
  saveActividadEstadoAdmin,
} from "@/services/admin-community.service";
import { listCatalogosParaActividad } from "@/services/actividad-catalogos.service";

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
  return runAdminCommunity(request, "PATCH /api/admin/actividades/[id]", async (user) => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");

    const body = await readJsonBody(request);
    if (!body || !Object.keys(body).length) return jsonError(400, "VALIDATION", "La solicitud no es válida.");
    const catalogos = await listCatalogosParaActividad();
    const soloEstado =
      Boolean(body) &&
      Object.keys(body).length === 1 &&
      ("estado" in body || "id_estado" in body);

    if (soloEstado) {
      const input = parseActividadEstado(body, catalogos.estado_publicacion);
      if (!input.ok) return jsonError(400, "VALIDATION", input.message);
      const saved = await saveActividadEstadoAdmin(parsed.value, input.value.id_estado);
      return saved
        ? jsonSuccess(saved)
        : jsonError(404, "NOT_FOUND", "Actividad no encontrada.");
    }

    const current = await getActividadAdmin(parsed.value);
    if (!current) return jsonError(404, "NOT_FOUND", "Actividad no encontrada.");

    // The joined place address is for display, not an implicit event override.
    const merged = { ...current, direccion: current.direccion_evento, ...coordinatePatch(body) };
    const sameImage = merged.imagen_url === current.imagen_url;
    const input = parseActividadInput(sameImage ? { ...merged, imagen_url: null } : merged, catalogos);
    if (!input.ok) return jsonError(400, "VALIDATION", input.message);
    if (sameImage) {
      input.value.imagen_url = current.imagen_url;
    } else if (input.value.imagen_url) {
      const owned = parseOwnedPortadaUrl(input.value.imagen_url);
      if (!owned || owned.contexto !== "actividades" || owned.registroId !== parsed.value) {
        return jsonError(400, "VALIDATION", "La imagen de la actividad no es válida.");
      }
    }

    const saved = await saveActividadAdmin(parsed.value, input.value, user.id);
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
