import MuseoPanel from "@/components/admin/museo/MuseoPanel";
import { listPiezasMuseoAdmin } from "@/services/admin-community.service";

export const metadata = { title: "Museo Digital — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminMuseoPage({ searchParams }) {
  const query = await searchParams;
  let pieces = [];
  let error = "";
  try {
    pieces = await listPiezasMuseoAdmin();
  } catch {
    error = "No se pudieron cargar las piezas del museo. Revisa la configuración de la base de datos.";
  }
  const notice =
    query.creado === "1" ? "Pieza creada correctamente." :
      query.eliminado === "1" ? "Pieza eliminada correctamente." : "";
  return <MuseoPanel pieces={pieces} error={error} notice={notice} />;
}
