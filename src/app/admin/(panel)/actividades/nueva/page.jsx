import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import ActividadForm from "@/components/admin/actividades/ActividadForm";

export const metadata = { title: "Nueva actividad — Admin Raíz Quilpué" };

export default async function AdminNuevaActividadPage() {
  await requireGestorContenidoPage();

  return <ActividadForm />;
}
