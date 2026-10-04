import ContenidosPanel from "@/components/admin/contenidos/ContenidosPanel";
import { listContenidosPanel } from "@/services/contenidos-admin.service";

export const metadata = { title: "Contenidos — Admin Raíz Quilpué" };

export const dynamic = "force-dynamic";

export default async function AdminContenidosPage({ searchParams }) {
  const query = await searchParams;
  let contenidos = [];
  let error = "";
  const notice =
    query.creado === "1"
      ? "Contenido creado correctamente."
      : query.eliminado === "1"
        ? "Contenido eliminado correctamente."
        : "";

  try {
    contenidos = await listContenidosPanel();
  } catch {
    error = "No se pudieron cargar los contenidos.";
  }

  return <ContenidosPanel contenidos={contenidos} error={error} notice={notice} />;
}
