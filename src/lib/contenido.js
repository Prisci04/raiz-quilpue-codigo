export function mapContenidoVista(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.titulo ?? "",
    description: row.resumen ?? "",
    content: row.contenido ?? "",
    tipo: row.tipo ?? "",
    image: row.imagen_url ?? null,
    date: row.fecha_publicacion ?? null,
  };
}
