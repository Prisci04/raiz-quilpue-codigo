import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseLugarInput } from "@/lib/lugares/validation.mjs";
import { getLugarById, updateLugar } from "@/services/lugares.service";

export const dynamic = "force-dynamic";

async function readId(params) {
  const { id } = await params;
  return parsePositiveInteger(id, { min: 1 });
}

export async function GET(request, { params }) {
  return runAdminCommunity(request, "GET /api/admin/lugares/[id]", async () => {
    const parsed = await readId(params);

    if (!parsed.ok) {
      return jsonError(400, "VALIDATION", "El identificador no es válido.");
    }

    const lugar = await getLugarById(parsed.value);

    if (!lugar) {
      return jsonError(404, "NOT_FOUND", "El lugar no existe.");
    }

    return jsonSuccess(lugar);
  });
}

export async function PATCH(request, { params }) {
  return runAdminCommunity(request, "PATCH /api/admin/lugares/[id]", async () => {
    const parsedId = await readId(params);

    if (!parsedId.ok) {
      return jsonError(400, "VALIDATION", "El identificador no es válido.");
    }

    const parsed = parseLugarInput(await readJsonBody(request));

    if (!parsed.ok) {
      return jsonError(400, "VALIDATION", parsed.message);
    }

    try {
      const lugar = await updateLugar(parsedId.value, parsed.value);

      if (!lugar) {
        return jsonError(404, "NOT_FOUND", "El lugar no existe.");
      }

      return jsonSuccess(lugar);
    } catch (error) {
      if (error?.code === "LUGAR_TAKEN") {
        return jsonError(409, "LUGAR_TAKEN", error.message);
      }

      throw error;
    }
  });
}
