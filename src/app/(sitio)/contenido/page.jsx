import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { getContenidos } from "@/services/contenido.service";
import ContenidoView from "./contenido-view";

export default async function ContenidoPage({ searchParams }) {
  let items = [];
  let error = "";

  try {
    const result = await getContenidos({ page: 1, limit: MAX_LIMIT });
    items = result.data.map(mapContenidoVista).filter(Boolean);
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
