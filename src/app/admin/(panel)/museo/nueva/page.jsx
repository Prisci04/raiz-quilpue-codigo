import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import PiezaMuseoForm from "@/components/admin/museo/PiezaMuseoForm";

export const metadata = { title: "Nueva pieza — Admin Raíz Quilpué" };

export default async function AdminNuevaPiezaPage() {
  await requireGestorContenidoPage();

  return <PiezaMuseoForm />;
}
