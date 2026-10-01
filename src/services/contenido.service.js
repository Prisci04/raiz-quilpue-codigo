import { getSupabaseServerClient } from "@/lib/supabase/server";

const ESTADO_PUBLICADA = "publicada";
const CONTENIDO_PUBLIC_COLUMNS =
  "id,titulo,resumen,contenido,tipo,imagen_url,fecha_publicacion";

function mapContenidoPublico(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    titulo: row.titulo,
    resumen: row.resumen,
    contenido: row.contenido,
    tipo: row.tipo,
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fecha_publicacion,
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

  const { data, error, count } = await publicadasQuery(CONTENIDO_PUBLIC_COLUMNS, {
    count: "exact",
  })
    .order("fecha_publicacion", { ascending: false })
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
    data: (data ?? []).map(mapContenidoPublico),
    pagination: buildPagination(page, limit, count ?? 0),
  };
}

export async function getContenidoById(id) {
  const { data, error } = await publicadasQuery(CONTENIDO_PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to get contenido");
  }

  return mapContenidoPublico(data);
}
