import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parsePiezaMuseoInput } from "@/lib/community-validation.mjs";
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
    const body = await readJsonBody(request);
    const input = parsePiezaMuseoInput(body);
    if (!input) return jsonError(400, "VALIDATION", "Revisa los datos de la pieza.");
    return jsonSuccess(await savePiezaMuseoAdmin(parsed.value, input));
  });
}

export async function DELETE(request, { params }) {
  return runAdminCommunity(request, "DELETE /api/admin/museo/[id]", async () => {
    const parsed = await parseId(params);
    if (!parsed.ok) return jsonError(400, "VALIDATION", "El identificador no es válido.");
    await deletePiezaMuseoAdmin(parsed.value);
    return jsonSuccess({ eliminado: true });
  });
}
