import { mapActividadVista } from "@/lib/actividades";
import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { getActividades } from "@/services/actividades.service";
import { getContenidos } from "@/services/contenido.service";
import HomeView from "./home-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [contentsResult, activitiesResult] = await Promise.allSettled([
    getContenidos({ page: 1, limit: MAX_LIMIT }).then((result) =>
      result.data.map(mapContenidoVista).filter(Boolean),
    ),
    getActividades({ page: 1, limit: MAX_LIMIT, orderBy: "fecha_creacion" }).then((result) =>
      result.data.map(mapActividadVista).filter(Boolean),
    ),
  ]);

  const contents = contentsResult.status === "fulfilled" ? contentsResult.value : [];
  const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value : [];

  return <HomeView contents={contents} activities={activities} />;
}
