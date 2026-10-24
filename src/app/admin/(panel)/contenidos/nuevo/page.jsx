import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import ContenidoForm from "@/components/admin/contenidos/ContenidoForm";

export const metadata = { title: "Nuevo contenido — Admin Raíz Quilpué" };

export default async function AdminNuevoContenidoPage() {
  await requireGestorContenidoPage();

  return <ContenidoForm mode="create" />;
}
