function formatHoraInicio(hora) {
  if (!hora) return "";

  const [hours, minutes] = String(hora).split(":");

  if (!hours || !minutes) return String(hora);

  return `${hours}:${minutes} hrs`;
}

export function mapActividadVista(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.titulo ?? "",
    description: row.descripcion ?? "",
    fullDescription: row.descripcion ?? "",
    date: row.fecha,
    time: formatHoraInicio(row.hora_inicio),
    location: row.ubicacion ?? "",
    image: row.imagen_url ?? null,
    cupos: Number(row.cupos) || 0,
  };
}
