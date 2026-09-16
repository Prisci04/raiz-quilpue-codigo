import { fetchActividadesPublicas } from "@/lib/api/actividades";
import { MAX_LIMIT } from "@/lib/http";
import ActividadesView from "./actividades-view";

export default async function ActividadesPage() {
  let activities = [];
  let error = "";

  try {
    activities = await fetchActividadesPublicas({
      page: 1,
      limit: MAX_LIMIT,
    });
  } catch {
    error =
      "No fue posible cargar las actividades. Inténtalo de nuevo más tarde.";
  }

  return <ActividadesView activities={activities} error={error} />;
}
