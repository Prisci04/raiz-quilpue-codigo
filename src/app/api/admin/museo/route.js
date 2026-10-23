import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parsePiezaMuseoInput } from "@/lib/community-validation.mjs";
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
  return runAdminCommunity(request, "POST /api/admin/museo", async () => {
    const parsed = parsePiezaMuseoInput(await readJsonBody(request));
    if (!parsed.ok) return jsonError(400, "VALIDATION", parsed.message);
    if (parsed.value.imagen_url) {
      return jsonError(400, "VALIDATION", "Sube la imagen después de crear la pieza.");
    }
    return jsonSuccess(await savePiezaMuseoAdmin(null, parsed.value), {}, 201);
  });
}
