import PiezaMuseoForm from "@/components/admin/museo/PiezaMuseoForm";

export const metadata = { title: "Editar pieza — Admin Raíz Quilpué" };

export default async function AdminEditarPiezaPage({ params }) {
  const { id } = await params;
  return <PiezaMuseoForm pieceId={id} />;
}
