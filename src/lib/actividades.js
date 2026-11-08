export const PUBLICOS_OBJETIVO = ["todas_edades", "mayores_18"];

export const PUBLICO_OBJETIVO_LABELS = {
  todas_edades: "Todas las edades",
  mayores_18: "Mayores de 18 años",
};

export function labelPublicoObjetivo(value) {
  return PUBLICO_OBJETIVO_LABELS[value] || "Por confirmar";
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isActividadPasada(fecha) {
  return Boolean(fecha) && fecha < todayISO();
}

export function cuposDisponibles(cupos, inscritos) {
  if (!Number.isInteger(cupos)) return null;
  const used = Number.isInteger(inscritos) ? inscritos : 0;
  return Math.max(0, cupos - used);
}

export function compareActividades(left, right) {
  const today = todayISO();

  function rank(row) {
    if (!row.fecha) return 1;
    return row.fecha >= today ? 0 : 2;
  }

  const rankDiff = rank(left) - rank(right);
  if (rankDiff !== 0) return rankDiff;

  if (!left.fecha && !right.fecha) return left.id - right.id;
  if (rank(left) === 2) {
    const past = String(right.fecha).localeCompare(String(left.fecha));
    return past || left.id - right.id;
  }

  const byDate = String(left.fecha).localeCompare(String(right.fecha));
  if (byDate) return byDate;

  const byTime = String(left.hora_inicio ?? "").localeCompare(String(right.hora_inicio ?? ""));
  return byTime || left.id - right.id;
}

export function mapActividadVista(row) {
  if (!row) {
    return null;
  }

  const inscritos = Number.isInteger(row.inscritos) ? row.inscritos : 0;
  const disponibles = cuposDisponibles(row.cupos, inscritos);

  return {
    id: row.id,
    titulo: row.titulo ?? "",
    descripcion: row.descripcion ?? "",
    fecha: row.fecha ?? null,
    hora_inicio: row.hora_inicio ?? null,
    hora_fin: row.hora_fin ?? null,
    lugar: row.lugar ?? null,
    direccion: row.direccion ?? null,
    google_place_id: row.google_place_id ?? null,
    latitud: row.latitud ?? null,
    longitud: row.longitud ?? null,
    publico_objetivo: row.publico_objetivo ?? null,
    modalidad: row.modalidad ?? null,
    tipo_participacion: row.tipo_participacion ?? null,
    cupos: row.cupos ?? null,
    inscritos,
    cupos_disponibles: disponibles,
    tipo_valor: row.tipo_valor ?? null,
    valor_monto: row.valor_monto ?? null,
    forma_pago: row.forma_pago ?? null,
    informacion_adicional: row.informacion_adicional ?? null,
    imagen_url: row.imagen_url ?? null,
    fecha_creacion: row.fecha_creacion ?? null,
    estado: row.estado ?? null,
    pasada: isActividadPasada(row.fecha),
  };
}
