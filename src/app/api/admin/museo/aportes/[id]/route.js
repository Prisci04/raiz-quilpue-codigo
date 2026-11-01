import {
  jsonError,
  jsonSuccess,
  parsePositiveInteger,
} from "@/lib/http";

import { runAdminCommunity } from "@/lib/admin-community-http";

import {
  deleteAporteMuseoAdmin,
} from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  return runAdminCommunity(
    request,
    "DELETE /api/admin/museo/aportes/[id]",
    async () => {
      const { id } = await params;

      const parsed = parsePositiveInteger(id, {
        min: 1,
      });

      if (!parsed.ok) {
        return jsonError(
          400,
          "VALIDATION",
          "El identificador no es válido.",
        );
      }

      const deleted = await deleteAporteMuseoAdmin(parsed.value);

      if (!deleted) {
        return jsonError(404, "NOT_FOUND", "El aporte no existe.");
      }

      return jsonSuccess({
        eliminado: true,
      });
    },
  );
}