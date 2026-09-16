import { getContenidosFromDb } from "@/lib/contenido-db";
import ContenidoView from "./contenido-view";

export default async function ContenidoPage() {
  let items = [];
  let error = "";

  try {
    items = await getContenidosFromDb();
  } catch {
    error =
      "No fue posible cargar los contenidos. Inténtalo de nuevo más tarde.";
  }

  return <ContenidoView items={items} error={error} />;
}
