import { jsonError, jsonSuccess, parsePositiveInteger } from "@/lib/http";
import { runAdminCommunity } from "@/lib/admin-community-http";
import { deleteParticipanteAdmin } from "@/services/admin-community.service";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  return runAdminCommunity(
    request,
    "DELETE /api/admin/actividades/[id]/participantes/[inscripcionId]",
    async () => {
      const { id, inscripcionId } = await params;
      const actividad = parsePositiveInteger(id, { min: 1 });
      const inscripcion = parsePositiveInteger(inscripcionId, { min: 1 });
      if (!actividad.ok || !inscripcion.ok) {
        return jsonError(400, "VALIDATION", "El identificador no es válido.");
      }
      const deleted = await deleteParticipanteAdmin(actividad.value, inscripcion.value);
      return deleted
        ? jsonSuccess({ eliminado: true })
        : jsonError(404, "NOT_FOUND", "Inscripción no encontrada.");
    },
  );
}
