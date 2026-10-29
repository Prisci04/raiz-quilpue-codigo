import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import { notFound } from "next/navigation";
import ActividadDetallePanel from "@/components/admin/actividades/ActividadDetallePanel";
import { parsePositiveInteger } from "@/lib/http";
import { mapActividadVista } from "@/lib/actividades";
import {
  countParticipantesAdmin,
  getActividadAdmin,
} from "@/services/admin-community.service";

export const metadata = { title: "Actividad — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminActividadDetallePage({ params }) {
  await requireGestorContenidoPage();

  const { id } = await params;
  const parsed = parsePositiveInteger(id, { min: 1 });
  if (!parsed.ok) notFound();

  const row = await getActividadAdmin(parsed.value);
  if (!row) notFound();

  let inscritos = 0;

  try {
    inscritos = await countParticipantesAdmin(parsed.value);
  } catch (errorCaught) {
    console.error(
      "[AdminActividadDetallePage] Error al contar participantes:",
      errorCaught,
    );
  }

  return (
    <ActividadDetallePanel activity={mapActividadVista({ ...row, inscritos })} />
  );
}
