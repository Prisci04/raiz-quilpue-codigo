import { connection } from "next/server";
import { mapContenidoVista } from "@/lib/contenido";
import { MAX_LIMIT } from "@/lib/http";
import { getContenidos } from "@/services/contenido.service";
import MuseoView from "./museo-view";

export const metadata = {
  title: "Museo Digital — Raíz Quilpué",
  description:
    "Explora las historias, imágenes y registros publicados sobre la memoria de Quilpué.",
};

export default async function MuseoPage() {
  await connection();

  let items = [];
  let error = "";

  try {
    const result = await getContenidos({ page: 1, limit: MAX_LIMIT });
    items = result.data.map(mapContenidoVista).filter(Boolean);
  } catch {
    error =
      "No fue posible cargar el museo digital. Inténtalo de nuevo más tarde.";
  }

  return <MuseoView items={items} error={error} />;
}
