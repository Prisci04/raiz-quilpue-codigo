import MuseoPanel from "@/components/admin/museo/MuseoPanel";
import {
  countAportesMuseoAdmin,
  listPiezasMuseoAdmin,
} from "@/services/admin-community.service";

export const metadata = { title: "Museo Digital — Admin Raíz Quilpué" };
export const dynamic = "force-dynamic";

export default async function AdminMuseoPage({ searchParams }) {
  const query = await searchParams;
  let pieces = [];
  let contributionCount = null;
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
      error={error}
      notice={notice}
    />
  );
}