import { NOMBRE_ESTADO_PUBLICADA } from "@/lib/catalogos.mjs";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const CONTENIDO_LIST_COLUMNS = `
  id_contenido,
  titulo,
  descripcion,
  resumen,
  imagen_url,
  fec_publicacion,
  fec_creacion,
  tipo_contenido ( nombre_tipo_contenido ),
  estado_publicacion!inner ( nombre_estado )
`;
const CONTENIDO_DETAIL_COLUMNS = `${CONTENIDO_LIST_COLUMNS},contenido`;

function nested(value) {
  return Array.isArray(value) ? value[0] : value;
}

function mapContenidoPublico(row, { includeContenido = false } = {}) {
  if (!row) {
    return null;
  }

  const contenido = {
    id: row.id_contenido,
    titulo: row.titulo,
    descripcion: row.descripcion ?? null,
    resumen: row.resumen ?? null,
    tipo: nested(row.tipo_contenido)?.nombre_tipo_contenido ?? "",
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fec_publicacion ?? null,
    fecha_creacion: row.fec_creacion ?? null,
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
    .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_PUBLICADA);
}

async function getPublicContenidosCount() {
  const { count, error } = await publicadasQuery("id_contenido,estado_publicacion!inner(nombre_estado)", {
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
    .order("fec_publicacion", { ascending: false, nullsFirst: false })
    .order("fec_creacion", { ascending: false })
    .order("id_contenido", { ascending: false })
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
    .eq("id_contenido", id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to get contenido");
  }

  return mapContenidoPublico(data, { includeContenido: true });
}
