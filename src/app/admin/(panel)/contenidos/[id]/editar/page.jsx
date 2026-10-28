import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import ContenidoForm from "@/components/admin/contenidos/ContenidoForm";

export const metadata = { title: "Editar contenido — Admin Raíz Quilpué" };

export const dynamic = "force-dynamic";

export default async function AdminEditarContenidoPage({ params, searchParams }) {
  await requireGestorContenidoPage();

  const { id } = await params;
  const query = await searchParams;
  const imageNotice = query.imagen === "subir" || query.imagen === "guardar" ? query.imagen : "";

  return <ContenidoForm mode="edit" contenidoId={id} imageNotice={imageNotice} />;
}
