import {
  findCatalogoByNombre,
  mismoNombreCatalogo,
  NOMBRE_COSTO_APORTE,
  NOMBRE_COSTO_GRATUITA,
  NOMBRE_COSTO_PAGADA,
  NOMBRE_ESTADO_BORRADOR,
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_MODALIDAD_VIRTUAL,
  NOMBRE_PARTICIPACION_ABIERTA,
  NOMBRE_PARTICIPACION_INSCRIPCION,
} from "./catalogos.mjs";

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

export function labelPublicoObjetivo(value) {
  return value || "Por confirmar";
}

export function esParticipacionInscripcion(value) {
  return mismoNombreCatalogo(value, NOMBRE_PARTICIPACION_INSCRIPCION);
}

export function esEstadoPublicada(value) {
  return mismoNombreCatalogo(value, NOMBRE_ESTADO_PUBLICADA);
}

export function esEstadoBorrador(value) {
  return mismoNombreCatalogo(value, NOMBRE_ESTADO_BORRADOR);
}

export function esCostoPagada(value) {
  return mismoNombreCatalogo(value, NOMBRE_COSTO_PAGADA);
}

export function labelModalidad(value) {
  if (!value) return "Pendiente";
  return mismoNombreCatalogo(value, NOMBRE_MODALIDAD_VIRTUAL) ? "Online" : value;
}

export function labelParticipacion(value, { corta = false } = {}) {
  if (!value) return corta ? "Por confirmar" : "Participación pendiente";
  if (esParticipacionInscripcion(value)) {
    return corta ? "Con inscripción" : "Requiere inscripción";
  }
  if (mismoNombreCatalogo(value, NOMBRE_PARTICIPACION_ABIERTA)) {
    return corta ? "Abierta" : "Participación abierta";
  }
  return value;
}

export function labelLugarActividad(activity, fallback = "Lugar pendiente") {
  const direccion =
    typeof activity?.lugar_direccion === "string" ? activity.lugar_direccion.trim() : "";
  const nombre = typeof activity?.lugar === "string" ? activity.lugar.trim() : "";
  return direccion || nombre || fallback;
}

export function labelCosto(value, monto) {
  if (!value) return "Pendiente";
  let label = value;
  if (mismoNombreCatalogo(value, NOMBRE_COSTO_GRATUITA)) label = "Gratuito";
  if (mismoNombreCatalogo(value, NOMBRE_COSTO_PAGADA)) label = "Pagado";
  if (mismoNombreCatalogo(value, NOMBRE_COSTO_APORTE)) label = "Voluntario";
  if (esCostoPagada(value) && Number.isInteger(monto)) {
    return `${label} · $${monto.toLocaleString("es-CL")}`;
  }
  return label;
}

export function cuposDisponibles(cupos, inscritos) {
  if (!Number.isInteger(cupos)) return null;
  const used = Number.isInteger(inscritos) ? inscritos : 0;
  return Math.max(0, cupos - used);
}

export function listaEsperaDisponibles(cupos, inscritos, cuposEspera = 0) {
  if (!Number.isInteger(cupos)) return null;
  const used = Number.isInteger(inscritos) ? inscritos : 0;
  const espera = Number.isInteger(cuposEspera) ? cuposEspera : 0;
  return Math.max(0, espera - Math.max(0, used - cupos));
}

export function capacidadInscripcion(cupos, cuposEspera = 0) {
  if (!Number.isInteger(cupos)) return null;
  const espera = Number.isInteger(cuposEspera) ? cuposEspera : 0;
  return cupos + espera;
}

export function inscripcionAceptaNuevos(activity) {
  if (!activity || activity.pasada || !esParticipacionInscripcion(activity.tipo_participacion)) {
    return false;
  }

  const cupos = Number.isInteger(activity.cupos) ? activity.cupos : null;
  if (cupos === null) return true;

  const restantes = Number.isInteger(activity.cupos_disponibles)
    ? activity.cupos_disponibles
    : cupos;
  const espera = Number.isInteger(activity.lista_espera_disponibles)
    ? activity.lista_espera_disponibles
    : Number.isInteger(activity.cupos_espera)
      ? activity.cupos_espera
      : 0;

  return restantes > 0 || espera > 0;
}

export function inscripcionEnEspera(activity) {
  if (!inscripcionAceptaNuevos(activity)) return false;
  const restantes = Number.isInteger(activity.cupos_disponibles)
    ? activity.cupos_disponibles
    : Number.isInteger(activity.cupos)
      ? activity.cupos
      : null;
  return restantes === 0;
}

export function markListaEspera(participants, cupos) {
  const rows = Array.isArray(participants) ? participants : [];
  if (!Number.isInteger(cupos)) {
    return rows.map((person) => ({ ...person, lista_espera: false, cupo: null }));
  }

  const ordered = [...rows].sort((left, right) => {
    const byDate = String(left.fecha_creacion ?? "").localeCompare(String(right.fecha_creacion ?? ""));
    if (byDate) return byDate;
    return (Number(left.id) || 0) - (Number(right.id) || 0);
  });
  const ranked = new Map(
    ordered.map((person, index) => [
      person.id,
      { lista_espera: index >= cupos, cupo: index + 1 },
    ]),
  );

  return rows.map((person) => ({ ...person, ...(ranked.get(person.id) ?? { lista_espera: false, cupo: null }) }));
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

function nested(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function mapActividadVista(row) {
  if (!row) {
    return null;
  }

  const lugar = nested(row.lugar);
  const comuna = nested(lugar?.comuna);
  const region = nested(comuna?.region);
  const publico = nested(row.publico_objetivo);
  const modalidad = nested(row.modalidad);
  const participacion = nested(row.tipo_participacion);
  const costo = nested(row.costo_actividad);
  const estado = nested(row.estado_publicacion);
  const inscritos = Number.isInteger(row.inscritos) ? row.inscritos : 0;
  const cupos = row.cupos_max ?? row.cupos ?? null;
  const cuposEspera = row.cupos_espera ?? 0;

  return {
    id: row.id_actividad ?? row.id,
    titulo: row.titulo ?? "",
    descripcion: row.descripcion ?? "",
    fecha: row.fecha ?? null,
    hora_inicio: row.hora_inicio ?? null,
    hora_fin: row.hora_fin ?? null,
    id_lugar: row.id_lugar ?? lugar?.id_lugar ?? null,
    id_comuna: row.id_comuna ?? lugar?.id_comuna ?? comuna?.id_comuna ?? null,
    id_region: row.id_region ?? comuna?.id_region ?? region?.id_region ?? null,
    lugar: lugar?.nombre_lugar ?? row.lugar_nombre ?? (typeof row.lugar === "string" ? row.lugar : null),
    lugar_direccion: lugar?.direccion ?? null,
    comuna: comuna?.nombre_comuna ?? row.comuna ?? null,
    region: region?.nombre_region ?? row.region ?? null,
    id_publico: row.id_publico ?? publico?.id_publico ?? null,
    publico_objetivo:
      publico?.nombre_publico ??
      row.publico_nombre ??
      (typeof row.publico_objetivo === "string" ? row.publico_objetivo : null),
    id_modalidad: row.id_modalidad ?? modalidad?.id_modalidad ?? null,
    modalidad:
      modalidad?.nombre_modalidad ??
      row.modalidad_nombre ??
      (typeof row.modalidad === "string" ? row.modalidad : null),
    id_tipo_participacion: row.id_tipo_participacion ?? participacion?.id_tipo_participacion ?? null,
    tipo_participacion:
      participacion?.nombre_tipo_participacion ??
      row.participacion_nombre ??
      (typeof row.tipo_participacion === "string" ? row.tipo_participacion : null),
    cupos,
    cupos_espera: cuposEspera,
    direccion_evento: Object.hasOwn(row, "direccion_evento") ? row.direccion_evento : row.direccion ?? null,
    direccion: row.direccion ?? lugar?.direccion ?? row.lugar_direccion ?? null,
    google_place_id: row.google_place_id ?? null,
    latitud: row.latitud ?? null,
    longitud: row.longitud ?? null,
    inscritos,
    cupos_disponibles: cuposDisponibles(cupos, inscritos),
    lista_espera_disponibles: listaEsperaDisponibles(cupos, inscritos, cuposEspera),
    id_costo: row.id_costo ?? costo?.id_costo ?? null,
    costo:
      costo?.nombre_costo ??
      row.costo_nombre ??
      (typeof row.costo === "string" ? row.costo : null),
    valor_monto: row.valor_monto ?? null,
    informacion_adicional: row.informacion_adicional ?? null,
    imagen_url: row.imagen_url ?? null,
    id_estado: row.id_estado ?? estado?.id_estado ?? null,
    estado:
      estado?.nombre_estado ??
      row.estado_nombre ??
      (typeof row.estado === "string" ? row.estado : null),
    fecha_creacion: row.fec_creacion ?? row.fecha_creacion ?? null,
    fecha_actualizacion: row.fec_actualizacion ?? row.fecha_actualizacion ?? null,
    pasada: isActividadPasada(row.fecha),
  };
}

export function findEstadoId(estados, nombre) {
  return findCatalogoByNombre(estados, nombre)?.id ?? null;
}
