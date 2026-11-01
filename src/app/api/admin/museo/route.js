import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parsePiezaMuseoInput } from "@/lib/community-validation.mjs";
import { aportanteDesdeUsuario } from "@/lib/museo";
import { listCatalogosMuseo } from "@/services/catalogos.service";
import {
  listPiezasMuseoAdmin,
  savePiezaMuseoAdmin,
} from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return runAdminCommunity(request, "GET /api/admin/museo", async () =>
    jsonSuccess(await listPiezasMuseoAdmin()),
  );
}

export async function POST(request) {
  return runAdminCommunity(request, "POST /api/admin/museo", async (user) => {
    const catalogos = await listCatalogosMuseo();
    const parsed = parsePiezaMuseoInput(await readJsonBody(request), catalogos);
    if (!parsed.ok) return jsonError(400, "VALIDATION", parsed.message);
    const aportante = aportanteDesdeUsuario(user);
    if (!aportante.correo_aportante) {
      return jsonError(400, "VALIDATION", "Tu cuenta no tiene un correo válido.");
    }
    return jsonSuccess(
      await savePiezaMuseoAdmin(null, { ...parsed.value, ...aportante }, user),
      {},
      201,
    );
  });
}
