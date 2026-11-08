import {
  jsonError,
  jsonSuccess,
  parsePositiveInteger,
} from "@/lib/http";

import { runAdminCommunity } from "@/lib/admin-community-http";

import {
  aprobarAporteMuseoAdmin,
} from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  return runAdminCommunity(
    request,
    "POST /api/admin/museo/aportes/[id]/aprobar",
    async (user) => {
      const { id } = await params;

      const parsed = parsePositiveInteger(id, {
        min: 1,
      });

      if (!parsed.ok) {
        return jsonError(
          400,
          "VALIDATION",
          "El identificador del aporte no es válido.",
        );
      }

      const result = await aprobarAporteMuseoAdmin(parsed.value, user.id);

      if (result.error === "NOT_FOUND") {
        return jsonError(
          404,
          "NOT_FOUND",
          "El aporte no existe.",
        );
      }

      if (result.error === "ALREADY_PROCESSED") {
        return jsonError(
          409,
          "ALREADY_PROCESSED",
          "Este aporte ya fue procesado.",
        );
      }

      return jsonSuccess({
        aprobado: true,
        aporte: result.aporte,
      });
    },
  );
}
