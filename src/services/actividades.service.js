import { compareActividades, mapActividadVista } from "@/lib/actividades";
import { NOMBRE_ESTADO_PUBLICADA, NOMBRE_INSCRIPCION_CANCELADA } from "@/lib/catalogos.mjs";
import { actividadUbicacionColumns, readActividadUbicacion } from "@/services/actividad-ubicacion.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVIDAD_LISTADO_COLUMNS = `
  id_actividad,
  titulo,
  descripcion,
  fecha,
  hora_inicio,
  hora_fin,
  cupos_max,
  cupos_espera,
  valor_monto,
  imagen_url,
  fec_creacion,
  id_modalidad,
  id_tipo_participacion,
  id_publico,
  id_costo,
  id_lugar,
  id_estado,
  modalidad ( nombre_modalidad ),
  tipo_participacion ( nombre_tipo_participacion ),
  publico_objetivo ( nombre_publico ),
  costo_actividad ( nombre_costo ),
  estado_publicacion!inner ( nombre_estado ),
  lugar ( nombre_lugar, direccion )
`;

const ACTIVIDAD_DETALLE_COLUMNS = `${ACTIVIDAD_LISTADO_COLUMNS},informacion_adicional`;

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
    .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_PUBLICADA);
}

async function countInscritos(ids) {
  const counts = new Map(ids.map((id) => [id, 0]));

  if (!ids.length) return counts;

  const { data, error } = await getSupabaseAdminClient()
    .from("inscripciones")
    .select("id_actividad, estado_inscripcion!inner(nombre_estado_inscripcion)")
    .in("id_actividad", ids)
    .neq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CANCELADA);

  if (error) {
    throw new Error("Failed to count inscripciones");
  }

  for (const row of data ?? []) {
    counts.set(row.id_actividad, (counts.get(row.id_actividad) ?? 0) + 1);
  }

  return counts;
}

export async function getActividades({ page, limit, orderBy = "fecha" }) {
  const ordenarPorCreacion = orderBy === "fecha_creacion";
  const { data, error } = await publicadasQuery(ACTIVIDAD_LISTADO_COLUMNS).order(
    ordenarPorCreacion ? "fec_creacion" : "id_actividad",
    { ascending: !ordenarPorCreacion },
  );

  if (error) {
    throw new Error("Failed to list actividades");
  }

  const rows = data ?? [];
  const counts = await countInscritos(rows.map((row) => row.id_actividad));
  const sorted = rows
    .map((row) =>
      mapActividadVista({
        ...row,
        inscritos: counts.get(row.id_actividad) ?? 0,
      }),
    )
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
      .eq("id_actividad", id).maybeSingle());

  if (error) {
    throw new Error("Failed to get actividad");
  }

  if (!data) return null;

  const counts = await countInscritos([data.id_actividad]);
  return mapActividadVista({
    ...data,
    inscritos: counts.get(data.id_actividad) ?? 0,
  });
}
