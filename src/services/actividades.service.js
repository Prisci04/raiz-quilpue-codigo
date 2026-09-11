import { getSupabaseServerClient } from "@/lib/supabase/server";

const ESTADO_PUBLICADA = "publicada";
const ACTIVIDAD_PUBLIC_COLUMNS =
  "id,titulo,descripcion,fecha,hora_inicio,ubicacion,cupos,imagen_url";

function mapActividadPublica(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fecha: row.fecha,
    hora_inicio: row.hora_inicio,
    ubicacion: row.ubicacion,
    cupos: row.cupos,
    imagen_url: row.imagen_url ?? null,
  };
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

  const { data, error, count } = await publicadasQuery(ACTIVIDAD_PUBLIC_COLUMNS, {
    count: "exact",
  })
    .order("fecha", { ascending: true })
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
    data: (data ?? []).map(mapActividadPublica),
    pagination: buildPagination(page, limit, count ?? 0),
  };
}

export async function getActividadById(id) {
  const { data, error } = await publicadasQuery(ACTIVIDAD_PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to get actividad");
  }

  return mapActividadPublica(data);
}
