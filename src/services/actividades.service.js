import { actividadUbicacionColumns, readActividadUbicacion } from "@/services/actividad-ubicacion.service";
import { compareActividades, cuposDisponibles } from "@/lib/actividades";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ESTADO_PUBLICADA = "publicada";
const ACTIVIDAD_LISTADO_COLUMNS =
  "id,titulo,descripcion,fecha,hora_inicio,hora_fin,lugar,publico_objetivo,modalidad,tipo_participacion,cupos,tipo_valor,valor_monto,imagen_url,fecha_creacion";
const ACTIVIDAD_DETALLE_COLUMNS = `${ACTIVIDAD_LISTADO_COLUMNS},forma_pago,informacion_adicional`;

function mapActividadPublica(row, { includeDetail = false, inscritos = 0 } = {}) {
  if (!row) {
    return null;
  }

  const actividad = {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fecha: row.fecha ?? null,
    hora_inicio: row.hora_inicio ?? null,
    hora_fin: row.hora_fin ?? null,
    lugar: row.lugar ?? null,
    publico_objetivo: row.publico_objetivo ?? null,
    modalidad: row.modalidad ?? null,
    tipo_participacion: row.tipo_participacion,
    cupos: row.cupos ?? null,
    inscritos,
    cupos_disponibles: cuposDisponibles(row.cupos, inscritos),
    tipo_valor: row.tipo_valor,
    valor_monto: row.valor_monto ?? null,
    imagen_url: row.imagen_url ?? null,
    fecha_creacion: row.fecha_creacion ?? null,
  };

  if (includeDetail) {
    actividad.direccion = row.direccion ?? null;
    actividad.google_place_id = row.google_place_id ?? null;
    actividad.latitud = row.latitud ?? null;
    actividad.longitud = row.longitud ?? null;
    actividad.forma_pago = row.forma_pago ?? null;
    actividad.informacion_adicional = row.informacion_adicional ?? null;
  }

  return actividad;
}

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

function publicadasQuery(columns, options) {
  return getSupabaseServerClient()
    .from("actividades")
    .select(columns, options)
    .eq("estado", ESTADO_PUBLICADA);
}

async function countInscritos(ids) {
  const counts = new Map(ids.map((id) => [id, 0]));

  if (!ids.length) return counts;

  const { data, error } = await getSupabaseAdminClient()
    .from("actividad_inscripciones")
    .select("actividad_id")
    .in("actividad_id", ids);

  if (error) {
    throw new Error("Failed to count inscripciones");
  }

  for (const row of data ?? []) {
    counts.set(row.actividad_id, (counts.get(row.actividad_id) ?? 0) + 1);
  }

  return counts;
}

export async function getActividades({ page, limit, orderBy = "fecha" }) {
  const ordenarPorCreacion = orderBy === "fecha_creacion";
  const { data, error } = await publicadasQuery(ACTIVIDAD_LISTADO_COLUMNS).order(
    ordenarPorCreacion ? "fecha_creacion" : "id",
    { ascending: !ordenarPorCreacion },
  );

  if (error) {
    throw new Error("Failed to list actividades");
  }

  const rows = data ?? [];
  const counts = await countInscritos(rows.map((row) => row.id));
  const sorted = rows
    .map((row) => mapActividadPublica(row, { inscritos: counts.get(row.id) ?? 0 }))
    .sort(
      orderBy === "fecha_creacion"
        ? (left, right) =>
            String(right.fecha_creacion ?? "").localeCompare(
              String(left.fecha_creacion ?? ""),
            ) || left.id - right.id
        : compareActividades,
    );

  const desde = (page - 1) * limit;

  return {
    data: sorted.slice(desde, desde + limit),
    pagination: buildPagination(page, limit, sorted.length),
  };
}

export async function getActividadById(id) {
  const { data, error } = await readActividadUbicacion((withLocation) =>
    publicadasQuery(ACTIVIDAD_DETALLE_COLUMNS + actividadUbicacionColumns(withLocation))
      .eq("id", id).maybeSingle());

  if (error) {
    throw new Error("Failed to get actividad");
  }

  if (!data) return null;

  const counts = await countInscritos([data.id]);
  return mapActividadPublica(data, {
    includeDetail: true,
    inscritos: counts.get(data.id) ?? 0,
  });
}
