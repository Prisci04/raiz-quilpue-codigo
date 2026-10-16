export function mapContenidoVista(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.titulo ?? "",
    description: row.descripcion ?? "",
    summary: row.resumen ?? "",
    tipo: row.tipo ?? "",
    image: row.imagen_url ?? null,
    date: row.fecha_publicacion ?? null,
    createdAt: row.fecha_creacion ?? null,
  };
}

export function mapContenidoDetalle(row) {
  const vista = mapContenidoVista(row);

  if (!vista) {
    return null;
  }

  return {
    ...vista,
    body: row.contenido ?? null,
  };
}
