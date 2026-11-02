import { MAX_LIMIT } from "@/lib/http";
import { getActividades } from "@/services/actividades.service";
import ActividadesView from "./actividades-view";

export default async function ActividadesPage({ searchParams }) {
  let activities = [];
  let error = "";

  try {
    const result = await getActividades({ page: 1, limit: MAX_LIMIT });
    activities = result.data.filter(Boolean);
  } catch {
    error =
      "No fue posible cargar las actividades. Inténtalo de nuevo más tarde.";
  }

  const params = await searchParams;
  const initialView = params?.vista === "calendario" ? "calendario" : "actividades";

  return <ActividadesView activities={activities} error={error} initialView={initialView} />;
}
