import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { parseLugarInput } from "@/lib/lugares/validation.mjs";
import { createLugar, listLugares } from "@/services/lugares.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return runAdminCommunity(request, "GET /api/admin/lugares", async () => {
    const idComuna = new URL(request.url).searchParams.get("id_comuna");
    const parsed = idComuna
      ? Number.parseInt(idComuna, 10)
      : null;

    return jsonSuccess(
      await listLugares({
        idComuna: Number.isInteger(parsed) && parsed > 0 ? parsed : undefined,
      }),
    );
  });
}

export async function POST(request) {
  return runAdminCommunity(request, "POST /api/admin/lugares", async () => {
    const parsed = parseLugarInput(await readJsonBody(request));

    if (!parsed.ok) {
      return jsonError(400, "VALIDATION", parsed.message);
    }

    try {
      return jsonSuccess(await createLugar(parsed.value), {}, 201);
    } catch (error) {
      if (error?.code === "LUGAR_TAKEN") {
        return jsonError(409, "LUGAR_TAKEN", error.message);
      }

      throw error;
    }
  });
}
