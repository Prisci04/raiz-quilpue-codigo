import { connection } from "next/server";
import { listPiezasMuseoPublicas } from "@/services/admin-community.service";
import { listCatalogo } from "@/services/catalogos.service";
import MuseoView from "./museo-view";

export const metadata = {
  title: "Museo Digital — Raíz Quilpué",
  description:
    "Explora las historias, imágenes y registros publicados sobre la memoria de Quilpué.",
};

export default async function MuseoPage() {
  await connection();

  let items = [];
  let categorias = [];
  let error = "";

  try {
    const [piezas, categoriaMuseo] = await Promise.all([
      listPiezasMuseoPublicas(),
      listCatalogo("categoria_museo"),
    ]);
    categorias = categoriaMuseo;
    items = piezas;
  } catch {
    error =
      "No fue posible cargar el museo digital. Inténtalo de nuevo más tarde.";
  }

  return <MuseoView items={items} categorias={categorias} error={error} />;
}
