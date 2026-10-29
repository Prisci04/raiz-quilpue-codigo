import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import { notFound } from "next/navigation";
import ContenidoDetallePanel from "@/components/admin/contenidos/ContenidoDetallePanel";
import { parsePositiveInteger } from "@/lib/http";
import { obtenerContenidoAdmin } from "@/services/contenidos-admin.service";

export const metadata = { title: "Contenido — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminContenidoDetallePage({ params }) {
  await requireGestorContenidoPage();

  const { id } = await params;
  const parsed = parsePositiveInteger(id, { min: 1 });
  if (!parsed.ok) notFound();

  const contenido = await obtenerContenidoAdmin(parsed.value);
  if (!contenido) notFound();

  return <ContenidoDetallePanel contenido={contenido} />;
}
