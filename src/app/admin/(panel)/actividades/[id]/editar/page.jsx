import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import { notFound } from "next/navigation";
import ActividadForm from "@/components/admin/actividades/ActividadForm";
import { parsePositiveInteger } from "@/lib/http";
import { getActividadAdmin } from "@/services/admin-community.service";

export const metadata = { title: "Editar actividad — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminEditarActividadPage({ params }) {
  await requireGestorContenidoPage();

  const { id } = await params;
  const parsed = parsePositiveInteger(id, { min: 1 });
  if (!parsed.ok) notFound();

  const activity = await getActividadAdmin(parsed.value);
  if (!activity) notFound();

  return <ActividadForm activityId={String(parsed.value)} initialActivity={activity} />;
}
