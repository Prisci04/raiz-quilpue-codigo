import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import ActividadesPanel from "@/components/admin/actividades/ActividadesPanel";
import { listActividadesAdmin } from "@/services/admin-community.service";

export const metadata = { title: "Actividades — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminActividadesPage({ searchParams }) {
  await requireGestorContenidoPage();

  const query = await searchParams;

  let activities = [];
  let error = "";

  try {
    activities = await listActividadesAdmin();
  } catch (errorCaught) {
    console.error(
      "[AdminActividadesPage] Error al cargar actividades:",
      errorCaught,
    );

    error =
      "No se pudieron cargar las actividades. Revisa la configuración de la base de datos.";
  }

  const notice =
    query.creado === "1"
      ? "Actividad creada correctamente."
      : query.guardado === "1"
        ? "Actividad guardada correctamente."
        : query.eliminado === "1"
          ? "Actividad eliminada correctamente."
          : "";

  return (
    <ActividadesPanel
      activities={activities}
      error={error}
      notice={notice}
    />
  );
}
