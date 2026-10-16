import { getSupabaseServerClient } from "@/lib/supabase/server";

const ESTADO_PUBLICADA = "publicada";
const CONTENIDO_LIST_COLUMNS =
  "id,titulo,descripcion,resumen,tipo,imagen_url,fecha_publicacion,fecha_creacion";
const CONTENIDO_DETAIL_COLUMNS =
  "id,titulo,descripcion,resumen,contenido,tipo,imagen_url,fecha_publicacion,fecha_creacion";

function mapContenidoPublico(row, { includeContenido = false } = {}) {
  if (!row) {
    return null;
  }

  const contenido = {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion ?? null,
    resumen: row.resumen ?? null,
    tipo: row.tipo,
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fecha_publicacion ?? null,
    fecha_creacion: row.fecha_creacion ?? null,
  };

  if (includeContenido) {
    contenido.contenido = row.contenido ?? null;
  }

  return contenido;
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
    .from("contenidos")
    .select(columns, options)
    .eq("estado", ESTADO_PUBLICADA);
}

async function getPublicContenidosCount() {
  const { count, error } = await publicadasQuery("id", {
    count: "exact",
    head: true,
  });

  if (error) {
    throw new Error("Failed to count contenidos");
  }

  return count ?? 0;
}

export async function getContenidos({ page, limit }) {
  const desde = (page - 1) * limit;
  const hasta = desde + limit - 1;

  const { data, error, count } = await publicadasQuery(CONTENIDO_LIST_COLUMNS, {
    count: "exact",
  })
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .order("fecha_creacion", { ascending: false })
    .order("id", { ascending: false })
    .range(desde, hasta);

  if (error) {
    if (isRangeNotSatisfiable(error)) {
      const total = await getPublicContenidosCount();
      return {
        data: [],
        pagination: buildPagination(page, limit, total),
      };
    }

    throw new Error("Failed to list contenidos");
  }

  return {
    data: (data ?? []).map((row) => mapContenidoPublico(row)),
    pagination: buildPagination(page, limit, count ?? 0),
  };
}

export async function getContenidoById(id) {
  const { data, error } = await publicadasQuery(CONTENIDO_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to get contenido");
  }

  return mapContenidoPublico(data, { includeContenido: true });
}
