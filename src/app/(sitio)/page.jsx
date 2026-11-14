import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { PAGINA_INICIO } from "@/lib/paginas/estructura.mjs";
import { getActividades } from "@/services/actividades.service";
import { getContenidos } from "@/services/contenido.service";
import { listPiezasMuseoPublicas } from "@/services/admin-community.service";
import { getPaginaPublica } from "@/services/paginas.service";
import HomeView from "./home-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [contentsResult, activitiesResult, museumResult, pageResult] = await Promise.allSettled([
    getContenidos({ page: 1, limit: MAX_LIMIT }).then((result) =>
      result.data.map(mapContenidoVista).filter(Boolean),
    ),
    getActividades({ page: 1, limit: MAX_LIMIT, orderBy: "fecha_creacion" }).then((result) =>
      result.data.filter(Boolean),
    ),
    listPiezasMuseoPublicas(),
    getPaginaPublica(PAGINA_INICIO),
  ]);

  const contents = contentsResult.status === "fulfilled" ? contentsResult.value : [];
  const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value : [];
  const museumItems = museumResult.status === "fulfilled" ? museumResult.value.slice(0, 3) : [];
  if (museumResult.status === "rejected") {
    console.error("[HomePage] Error al cargar piezas del museo:", museumResult.reason);
  }
  if (pageResult.status === "rejected") {
    console.error("[HomePage] Error al cargar el contenido de la página:", pageResult.reason);
  }
  const page = pageResult.status === "fulfilled" ? pageResult.value : null;

  return (
    <HomeView
      page={page}
      contents={contents}
      activities={activities}
      museumItems={museumItems}
      museumError={museumResult.status === "rejected"}
    />
  );
}
