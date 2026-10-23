import { connection } from "next/server";
import { listPiezasMuseoPublicas } from "@/services/admin-community.service";
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
    items = (await listPiezasMuseoPublicas()).map((piece) => ({
      id: piece.id,
      title: piece.titulo,
      description: piece.descripcion,
      content: [piece.fecha_aproximada, piece.lugar].filter(Boolean).join(" · "),
      tipo: piece.categoria,
      image: piece.imagen_url,
      fileName: piece.archivo_nombre,
      fileUrl: piece.archivo_url,
      date: piece.fecha_aproximada,
    }));
  } catch {
    error =
      "No fue posible cargar el museo digital. Inténtalo de nuevo más tarde.";
  }

  return <MuseoView items={items} error={error} />;
}
