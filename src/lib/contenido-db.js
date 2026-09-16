import { getSupabaseServerClient } from "@/lib/supabase/server";

function mapContenido(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.titulo ?? "",
    description: row.resumen ?? row.contenido ?? "",
    tipo: row.tipo ?? "",
    image: row.imagen_url ?? null,
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
