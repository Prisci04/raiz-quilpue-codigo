import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parsePiezaMuseoInput } from "@/lib/community-validation.mjs";
import { parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import {
  deletePiezaMuseoAdmin,
  getPiezaMuseoAdmin,
  savePiezaMuseoAdmin,
} from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

async function parseId(params) {
  const { id } = await params;
  return parsePositiveInteger(id, { min: 1 });
}

export async function GET(request, { params }) {
  return runAdminCommunity(request, "GET /api/admin/museo/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const pieza = await getPiezaMuseoAdmin(parsed.value);
    return pieza ? jsonSuccess(pieza) : jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
  });
}

export async function PATCH(request, { params }) {
  return runAdminCommunity(request, "PATCH /api/admin/museo/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const current = await getPiezaMuseoAdmin(parsed.value);
    if (!current) return jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
    const body = await readJsonBody(request);
    const sameImage = body.imagen_url === current.imagen_url;
    const input = parsePiezaMuseoInput(sameImage ? { ...body, imagen_url: null } : body);
    if (!input.ok) return jsonError(400, "VALIDATION", input.message);
    if (sameImage) {
      input.value.imagen_url = current.imagen_url;
    } else if (input.value.imagen_url) {
      const owned = parseOwnedPortadaUrl(input.value.imagen_url);
      if (owned && (owned.contexto !== "museo" || owned.registroId !== parsed.value)) {
        return jsonError(400, "VALIDATION", "La imagen de la pieza no es válida.");
      }
    }
    const saved = await savePiezaMuseoAdmin(parsed.value, input.value);
    return saved
      ? jsonSuccess(saved)
      : jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
  });
}

export async function DELETE(request, { params }) {
  return runAdminCommunity(request, "DELETE /api/admin/museo/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const deleted = await deletePiezaMuseoAdmin(parsed.value);
    return deleted
      ? jsonSuccess({ eliminado: true })
      : jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
  });
}
