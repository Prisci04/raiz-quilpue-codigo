import { jsonError, jsonSuccess } from "@/lib/http";
import { runAdminCommunity, readJsonBody } from "@/lib/admin-community-http";
import { GeocodingError } from "@/lib/maps/openstreetmap.mjs";
import { searchOpenStreetMap } from "@/services/openstreetmap-geocoding.service";

export const dynamic = "force-dynamic";
export async function POST(request) {
  return runAdminCommunity(request, "POST /api/admin/actividades/ubicacion", async () => {
    const body = await readJsonBody(request);
    try {
      return jsonSuccess(await searchOpenStreetMap(body?.query, { signal: request.signal }));
    } catch (error) {
      if (error instanceof GeocodingError) return jsonError(error.status, error.code, error.message);
      if (error.name === "AbortError") return jsonError(408, "GEOCODING_ABORTED", "Búsqueda cancelada.");
      throw error;
    }
  });
}
