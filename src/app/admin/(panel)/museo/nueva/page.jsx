import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import PiezaMuseoForm from "@/components/admin/museo/PiezaMuseoForm";
import { listCatalogosMuseo } from "@/services/catalogos.service";

export const metadata = { title: "Nueva pieza — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminNuevaPiezaPage() {
  await requireGestorContenidoPage();
  const catalogos = await listCatalogosMuseo();

  return <PiezaMuseoForm categorias={catalogos.categoria_museo ?? []} />;
}
