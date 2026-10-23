import { notFound } from "next/navigation";
import ParticipantesPanel from "@/components/admin/actividades/ParticipantesPanel";
import { parsePositiveInteger } from "@/lib/http";
import {
  getActividadAdmin,
  listParticipantesAdmin,
} from "@/services/admin-community.service";

export const metadata = { title: "Participantes — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminParticipantesPage({ params }) {
  const { id } = await params;
  const parsed = parsePositiveInteger(id, { min: 1 });
  if (!parsed.ok) notFound();

  const activity = await getActividadAdmin(parsed.value);
  if (!activity) notFound();

  let participants = [];
  let error = "";

  try {
    participants = await listParticipantesAdmin(parsed.value);
  } catch (errorCaught) {
    console.error(
      "[AdminParticipantesPage] Error al cargar participantes:",
      errorCaught,
    );
    error = "No se pudieron cargar los participantes.";
  }

  return (
    <ParticipantesPanel
      activity={activity}
      initialParticipants={participants}
      error={error}
    />
  );
}
