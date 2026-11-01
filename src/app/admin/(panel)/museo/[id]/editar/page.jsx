import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import { notFound } from "next/navigation";
import PiezaMuseoForm from "@/components/admin/museo/PiezaMuseoForm";
import { parsePositiveInteger } from "@/lib/http";
import { esRevisionAprobado } from "@/lib/museo";
import { getPiezaMuseoAdmin } from "@/services/admin-community.service";
import { listCatalogosMuseo } from "@/services/catalogos.service";

export const metadata = { title: "Editar pieza — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminEditarPiezaPage({ params }) {
  await requireGestorContenidoPage();

  const { id } = await params;
  const parsed = parsePositiveInteger(id, { min: 1 });
  if (!parsed.ok) notFound();

  const [piece, catalogos] = await Promise.all([
    getPiezaMuseoAdmin(parsed.value),
    listCatalogosMuseo(),
  ]);
  if (!piece || !esRevisionAprobado(piece.estado_revision)) notFound();

  return (
    <PiezaMuseoForm
      pieceId={String(parsed.value)}
      initialPiece={piece}
      categorias={catalogos.categoria_museo ?? []}
    />
  );
}
