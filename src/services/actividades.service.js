import { getSupabaseServerClient } from "@/lib/supabase/server";

const ESTADO_PUBLICADA = "publicada";
const ACTIVIDAD_LISTADO_COLUMNS =
  "id,titulo,descripcion,fecha,hora_inicio,hora_fin,lugar,publico_objetivo,modalidad,tipo_participacion,cupos,tipo_valor,valor_monto,imagen_url";
const ACTIVIDAD_DETALLE_COLUMNS = `${ACTIVIDAD_LISTADO_COLUMNS},forma_pago,informacion_adicional`;

function mapActividadPublica(row, { includeDetail = false } = {}) {
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
    tipo_valor: row.tipo_valor,
    valor_monto: row.valor_monto ?? null,
    imagen_url: row.imagen_url ?? null,
  };

  if (includeDetail) {
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
    totalPages: Math.ceil(total / limit),
  };
}

function isRangeNotSatisfiable(error) {
  return error?.code === "PGRST103";
}

function publicadasQuery(columns, options) {
  return getSupabaseServerClient()
    .from("actividades")
    .select(columns, options)
    .eq("estado", ESTADO_PUBLICADA);
}

async function getPublicActividadesCount() {
  const { count, error } = await publicadasQuery("id", {
    count: "exact",
    head: true,
  });

  if (error) {
    throw new Error("Failed to count actividades");
  }

  return count ?? 0;
}

export async function getActividades({ page, limit }) {
  const desde = (page - 1) * limit;
  const hasta = desde + limit - 1;

  const { data, error, count } = await publicadasQuery(ACTIVIDAD_LISTADO_COLUMNS, {
    count: "exact",
  })
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("hora_inicio", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(desde, hasta);

  if (error) {
    if (isRangeNotSatisfiable(error)) {
      const total = await getPublicActividadesCount();
      return {
        data: [],
        pagination: buildPagination(page, limit, total),
      };
    }

    throw new Error("Failed to list actividades");
  }

  return {
    data: (data ?? []).map((row) => mapActividadPublica(row)),
    pagination: buildPagination(page, limit, count ?? 0),
  };
}

export async function getActividadById(id) {
  const { data, error } = await publicadasQuery(ACTIVIDAD_DETALLE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to get actividad");
  }

  return mapActividadPublica(data, { includeDetail: true });
}
