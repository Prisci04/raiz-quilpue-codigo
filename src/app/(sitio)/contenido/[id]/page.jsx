import { notFound } from "next/navigation";
import { mapContenidoDetalle } from "@/lib/contenido";
import { getContenidoById } from "@/services/contenido.service";
import ContenidoNotaView from "./contenido-nota-view";

async function loadContenido(id) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId < 1) {
    return null;
  }

  const row = await getContenidoById(numericId);
  return mapContenidoDetalle(row);
}

export async function generateMetadata({ params }) {
  const { id } = await params;

  try {
    const contenido = await loadContenido(id);

    if (!contenido?.title) {
      return { title: "Contenido — Raíz Quilpué" };
    }

    return { title: `${contenido.title} — Raíz Quilpué` };
  } catch {
    return { title: "Contenido — Raíz Quilpué" };
  }
}

export default async function ContenidoNotaPage({ params }) {
  const { id } = await params;
  let contenido = null;

  try {
    contenido = await loadContenido(id);
  } catch {
    throw new Error("No fue posible cargar el contenido.");
  }

  if (!contenido) {
    notFound();
  }

  return <ContenidoNotaView contenido={contenido} />;
}
