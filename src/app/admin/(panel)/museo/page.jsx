import { requireGestorContenidoPage } from "@/lib/auth/page-guard";
import MuseoPanel from "@/components/admin/museo/MuseoPanel";
import {
  countAportesMuseoAdmin,
  countAportesPendientesMuseoAdmin,
  listPiezasMuseoAdmin,
} from "@/services/admin-community.service";

export const metadata = { title: "Museo Digital — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminMuseoPage({ searchParams }) {
  await requireGestorContenidoPage();

  const query = await searchParams;
  let pieces = [];
  let contributionCount = null;
  let pendingContributionCount = 0;
  let error = "";

  try {
    pieces = await listPiezasMuseoAdmin();
  } catch (errorCaught) {
    console.error(
      "[AdminMuseoPage] Error al cargar piezas del museo:",
      errorCaught,
    );

    error =
      "No se pudieron cargar las piezas del museo. Revisa la configuración de la base de datos.";
  }

  try {
    contributionCount = await countAportesMuseoAdmin();
  } catch (errorCaught) {
    console.error(
      "[AdminMuseoPage] Error al contar aportes recibidos:",
      errorCaught,
    );

    error = error
      ? `${error} No se pudo cargar la cantidad de aportes recibidos.`
      : "No se pudo cargar la cantidad de aportes recibidos.";
  }

  try {
    pendingContributionCount = await countAportesPendientesMuseoAdmin();
  } catch (errorCaught) {
    console.error(
      "[AdminMuseoPage] Error al contar aportes pendientes:",
      errorCaught,
    );
  }

  const notice =
    query.creado === "1"
      ? "Pieza creada correctamente."
      : query.guardado === "1"
        ? "Pieza guardada correctamente."
        : query.eliminado === "1"
          ? "Pieza eliminada correctamente."
          : "";

  return (
    <MuseoPanel
      pieces={pieces}
      contributionCount={contributionCount}
      pendingContributionCount={pendingContributionCount}
      error={error}
      notice={notice}
    />
  );
}