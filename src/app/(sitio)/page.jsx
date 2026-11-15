import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { getActividades } from "@/services/actividades.service";
import { getContenidos } from "@/services/contenido.service";
import { PAGINA_INICIO } from "@/lib/paginas/estructura.mjs";
import { getPaginaPublica } from "@/services/paginas.service";
import HomeView from "./home-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [contentsResult, activitiesResult, pageResult] = await Promise.allSettled([
    getContenidos({ page: 1, limit: MAX_LIMIT }).then((result) =>
      result.data.map(mapContenidoVista).filter(Boolean),
    ),
    getActividades({ page: 1, limit: MAX_LIMIT, orderBy: "fecha_creacion" }).then((result) =>
      result.data.filter(Boolean),
    ),
    getPaginaPublica(PAGINA_INICIO),
  ]);

  const contents = contentsResult.status === "fulfilled" ? contentsResult.value : [];
  const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value : [];

  return <HomeView page={pageResult.status === "fulfilled" ? pageResult.value : null} contents={contents} activities={activities} />;
}
