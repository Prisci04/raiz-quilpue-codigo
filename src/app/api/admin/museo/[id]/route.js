import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parsePiezaMuseoInput } from "@/lib/community-validation.mjs";
import { parseOwnedAporteImageUrl, parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import { esRevisionAprobado } from "@/lib/museo";
import { listCatalogosMuseo } from "@/services/catalogos.service";
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

function allowedImage(url, aporteId) {
  const aporte = parseOwnedAporteImageUrl(url);
  if (aporte) return true;
  const owned = parseOwnedPortadaUrl(url);
  return Boolean(owned && owned.contexto === "museo" && owned.registroId === aporteId);
}

export async function GET(request, { params }) {
  return runAdminCommunity(request, "GET /api/admin/museo/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const pieza = await getPiezaMuseoAdmin(parsed.value);
    if (!pieza || !esRevisionAprobado(pieza.estado_revision)) {
      return jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
    }
    return jsonSuccess(pieza);
  });
}

export async function PATCH(request, { params }) {
  return runAdminCommunity(request, "PATCH /api/admin/museo/[id]", async (user) => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const current = await getPiezaMuseoAdmin(parsed.value);
    if (!current || !esRevisionAprobado(current.estado_revision)) {
      return jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
    }
    const body = await readJsonBody(request);
    if (!body) return jsonError(400, "VALIDATION", "La solicitud no es válida.");
    const catalogos = await listCatalogosMuseo();
    const sameImage = body.imagen_url === current.imagen_url;
    const input = parsePiezaMuseoInput(
      sameImage ? { ...body, imagen_url: current.imagen_url } : body,
      catalogos,
    );
    if (!input.ok) return jsonError(400, "VALIDATION", input.message);
    if (!allowedImage(input.value.imagen_url, parsed.value)) {
      return jsonError(400, "VALIDATION", "La imagen de la pieza no es válida.");
    }
    const saved = await savePiezaMuseoAdmin(parsed.value, input.value, user);
    return saved
      ? jsonSuccess(saved)
      : jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
  });
}

export async function DELETE(request, { params }) {
  return runAdminCommunity(request, "DELETE /api/admin/museo/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    const current = await getPiezaMuseoAdmin(parsed.value);
    if (!current || !esRevisionAprobado(current.estado_revision)) {
      return jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
    }
    const deleted = await deletePiezaMuseoAdmin(parsed.value);
    return deleted
      ? jsonSuccess({ eliminado: true })
      : jsonError(404, "NOT_FOUND", "Pieza no encontrada.");
  });
}
