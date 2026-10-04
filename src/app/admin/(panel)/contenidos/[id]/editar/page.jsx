import ContenidoForm from "@/components/admin/contenidos/ContenidoForm";

export const metadata = { title: "Editar contenido — Admin Raíz Quilpué" };

export const dynamic = "force-dynamic";

export default async function AdminEditarContenidoPage({ params }) {
  const { id } = await params;

  return <ContenidoForm mode="edit" contenidoId={id} />;
}
