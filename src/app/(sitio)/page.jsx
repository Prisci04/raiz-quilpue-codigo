import { getContenidosFromDb } from "@/lib/contenido-db";
import { fetchActividadesPublicas } from "@/lib/api/actividades";
import { MAX_LIMIT } from "@/lib/http";
import HomeView from "./home-view";

export default async function HomePage() {
  const [contentsResult, activitiesResult] = await Promise.allSettled([
    getContenidosFromDb(),
    fetchActividadesPublicas({ page: 1, limit: MAX_LIMIT }),
  ]);

  const contents = contentsResult.status === "fulfilled" ? contentsResult.value : [];
  const activities = activitiesResult.status === "fulfilled" ? activitiesResult.value : [];

  return <HomeView contents={contents} activities={activities} />;
}
