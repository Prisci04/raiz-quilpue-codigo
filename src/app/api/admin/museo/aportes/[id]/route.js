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

      await deleteAporteMuseoAdmin(parsed.value);

      return jsonSuccess({
        eliminado: true,
      });
    },
  );
}