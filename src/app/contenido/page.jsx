import { getContenidosFromDb } from "@/lib/contenido-db";
import ContenidoView from "./contenido-view";

export default async function ContenidoPage({ searchParams }) {
  let items = [];
  let error = "";

  try {
    items = await getContenidosFromDb();
  } catch {
    error =
      "No fue posible cargar los contenidos. Inténtalo de nuevo más tarde.";
  }

  const params = await searchParams;

  return (
    <ContenidoView
      items={items}
      error={error}
      initialTipo={params?.tipo ?? "todos"}
      initialQuery={params?.q ?? ""}
    />
  );
}
