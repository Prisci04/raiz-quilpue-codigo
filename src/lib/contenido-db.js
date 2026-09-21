import { getSupabaseServerClient } from "@/lib/supabase/server";

function mapContenido(row) {
  if (!row) return null;

  let image = row.imagen_url ?? null;

if (!image) {
  if (row.titulo === "Cápsula histórica: recuerdos de Quilpué") {
    image = "/images/contenido/capsula-recuerdos1.jpg";
  }

  if (row.titulo === "El patrimonio ferroviario de Quilpué") {
    image = "/images/contenido/patrimonio-ferrocarril.jpg";
  }

  if (row.titulo === "TU TERCER TITULO") {
    image = "/images/contenido/archivo-historico.jpg";
  }
}

  return {
    id: row.id,
    title: row.titulo ?? "",
    description: row.resumen ?? row.contenido ?? "",
    content: row.contenido ?? row.resumen ?? "",
    tipo: row.tipo ?? "",
    image,
    date: row.fecha_publicacion ?? row.fecha_creacion ?? null,
  };
}

export async function getContenidosFromDb() {
  const { data, error } = await getSupabaseServerClient()
    .from("contenidos")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    throw new Error("Failed to list contenidos");
  }

  return (data ?? [])
    .filter((row) => !row.estado || row.estado === "publicada")
    .map(mapContenido)
    .filter(Boolean)
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
}
