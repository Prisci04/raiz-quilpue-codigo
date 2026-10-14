import { notFound } from "next/navigation";
import PiezaMuseoForm from "@/components/admin/museo/PiezaMuseoForm";
import { parsePositiveInteger } from "@/lib/http";
import { getPiezaMuseoAdmin } from "@/services/admin-community.service";

export const metadata = { title: "Editar pieza — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminEditarPiezaPage({ params }) {
  const { id } = await params;
  const parsed = parsePositiveInteger(id, { min: 1 });
  if (!parsed.ok) notFound();

  const piece = await getPiezaMuseoAdmin(parsed.value);
  if (!piece) notFound();

  return <PiezaMuseoForm pieceId={String(parsed.value)} initialPiece={piece} />;
}
