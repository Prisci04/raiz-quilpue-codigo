import { compareActividades, mapActividadVista } from "@/lib/actividades";
import {
  NOMBRE_ESTADO_FINALIZADA,
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_INSCRIPCION_CONFIRMADA,
  NOMBRE_INSCRIPCION_ESPERA,
} from "@/lib/catalogos.mjs";
import { logInternalError } from "@/lib/http";
import { actividadUbicacionColumns, readActividadUbicacion } from "@/services/actividad-ubicacion.service";
import { finalizarActividadesVencidas } from "@/services/actividades-finalizacion.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function sincronizarFinalizacion() {
  try {
    await finalizarActividadesVencidas();
  } catch {
    logInternalError("finalizar actividades");
  }
}

const ESTADOS_PORTAL = [NOMBRE_ESTADO_PUBLICADA, NOMBRE_ESTADO_FINALIZADA];

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
    .in("estado_publicacion.nombre_estado", ESTADOS_PORTAL);
}

async function countInscritos(ids) {
  const confirmadas = new Map(ids.map((id) => [id, 0]));
  const espera = new Map(ids.map((id) => [id, 0]));

  if (!ids.length) return { confirmadas, espera };

  const { data, error } = await getSupabaseAdminClient()
    .from("inscripciones")
    .select("id_actividad, estado_inscripcion!inner(nombre_estado_inscripcion)")
    .in("id_actividad", ids)
    .in("estado_inscripcion.nombre_estado_inscripcion", [
      NOMBRE_INSCRIPCION_CONFIRMADA,
      NOMBRE_INSCRIPCION_ESPERA,
    ]);

  if (error) {
    throw new Error("Failed to count inscripciones");
  }

  for (const row of data ?? []) {
    const estado = Array.isArray(row.estado_inscripcion)
      ? row.estado_inscripcion[0]?.nombre_estado_inscripcion
      : row.estado_inscripcion?.nombre_estado_inscripcion;
    if (estado === NOMBRE_INSCRIPCION_CONFIRMADA) {
      confirmadas.set(row.id_actividad, (confirmadas.get(row.id_actividad) ?? 0) + 1);
    } else if (estado === NOMBRE_INSCRIPCION_ESPERA) {
      espera.set(row.id_actividad, (espera.get(row.id_actividad) ?? 0) + 1);
    }
  }

  return { confirmadas, espera };
}

export async function getActividades({ page, limit, orderBy = "fecha" }) {
  await sincronizarFinalizacion();
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
        inscritos: counts.confirmadas.get(row.id_actividad) ?? 0,
        inscritos_espera: counts.espera.get(row.id_actividad) ?? 0,
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
  await sincronizarFinalizacion();
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
    inscritos: counts.confirmadas.get(data.id_actividad) ?? 0,
    inscritos_espera: counts.espera.get(data.id_actividad) ?? 0,
  });
}
