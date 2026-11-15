import "server-only";

import {
  CONTENT_TYPE_COLORS,
  CONTENT_TYPE_LABELS,
  MUSEUM_CATEGORY_COLORS,
  MUSEUM_CATEGORY_LABELS,
  buildCategorySlices,
} from "@/lib/admin-dashboard";
import {
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_INSCRIPCION_CONFIRMADA,
  NOMBRE_REVISION_APROBADO,
} from "@/lib/catalogos.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const TIME_ZONE = "America/Santiago";
const MONTH_COUNT = 6;

function assertQuery(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result;
}

async function countRows(query, label) {
  const result = assertQuery(await query, label);

  if (!Number.isInteger(result.count)) {
    throw new Error(`${label}: Supabase did not return an exact count`);
  }

  return result.count;
}

function chileMonthStart(year, monthIndex) {
  const target = Date.UTC(year, monthIndex, 1);
  let timestamp = target;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const localAsUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );

    timestamp += target - localAsUtc;
  }

  return new Date(timestamp).toISOString();
}

function monthSeriesStart(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return { year, monthIndex: month - 1 };
}

function monthLabel(year, monthIndex) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    month: "short",
  })
    .format(new Date(Date.UTC(year, monthIndex, 1)))
    .replace(".", "");
}

export async function getAdminDashboardData({ now = new Date() } = {}) {
  const admin = getSupabaseAdminClient();
  const currentMonth = monthSeriesStart(now);
  const months = Array.from({ length: MONTH_COUNT }, (_, index) => {
    const monthDate = new Date(
      Date.UTC(currentMonth.year, currentMonth.monthIndex - (MONTH_COUNT - 1 - index), 1),
    );
    return {
      year: monthDate.getUTCFullYear(),
      monthIndex: monthDate.getUTCMonth(),
    };
  });

  const contentTypes = Object.keys(CONTENT_TYPE_LABELS);
  const museumCategories = Object.keys(MUSEUM_CATEGORY_LABELS);

  const [
    totalContents,
    publishedContents,
    contentTypeCounts,
    publishedActivitiesResult,
    totalEnrollments,
    monthlyEnrollments,
    publishedMuseumPieces,
    museumCategoryCounts,
  ] = await Promise.all([
    countRows(
      admin.from("contenidos").select("id_contenido", { count: "exact", head: true }),
      "Failed to count contenidos",
    ),
    countRows(
      admin
        .from("contenidos")
        .select("id_contenido,estado_publicacion!inner(nombre_estado)", {
          count: "exact",
          head: true,
        })
        .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_PUBLICADA),
      "Failed to count published contenidos",
    ),
    Promise.all(
      contentTypes.map(async (tipo) => [
        tipo,
        await countRows(
          admin
            .from("contenidos")
            .select(
              "id_contenido,estado_publicacion!inner(nombre_estado),tipo_contenido!inner(nombre_tipo_contenido)",
              { count: "exact", head: true },
            )
            .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_PUBLICADA)
            .eq("tipo_contenido.nombre_tipo_contenido", tipo),
          `Failed to count published contenidos of type ${tipo}`,
        ),
      ]),
    ),
    admin
      .from("actividades")
      .select("id_actividad,titulo,estado_publicacion!inner(nombre_estado)")
      .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_PUBLICADA)
      .order("fec_creacion", { ascending: false }),
    countRows(
      admin
        .from("inscripciones")
        .select("id_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)", {
          count: "exact",
          head: true,
        })
        .eq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CONFIRMADA),
      "Failed to count actividad inscripciones",
    ),
    Promise.all(
      months.map(async ({ year, monthIndex }) => {
        const start = chileMonthStart(year, monthIndex);
        const end = chileMonthStart(year, monthIndex + 1);
        const value = await countRows(
          admin
            .from("inscripciones")
            .select("id_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)", {
              count: "exact",
              head: true,
            })
            .eq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CONFIRMADA)
            .gte("fec_inscripcion", start)
            .lt("fec_inscripcion", end),
          "Failed to count monthly actividad inscripciones",
        );

        return { label: monthLabel(year, monthIndex), value };
      }),
    ),
    countRows(
      admin
        .from("museo_aportes")
        .select("id_aporte,estado_revision!inner(nombre_estado_revision)", {
          count: "exact",
          head: true,
        })
        .eq("estado_revision.nombre_estado_revision", NOMBRE_REVISION_APROBADO),
      "Failed to count published museo piezas",
    ),
    Promise.all(
      museumCategories.map(async (categoria) => [
        categoria,
        await countRows(
          admin
            .from("museo_aportes")
            .select(
              "id_aporte,estado_revision!inner(nombre_estado_revision),categoria_museo!inner(nombre_categoria)",
              { count: "exact", head: true },
            )
            .eq("estado_revision.nombre_estado_revision", NOMBRE_REVISION_APROBADO)
            .eq("categoria_museo.nombre_categoria", categoria),
          `Failed to count published museo piezas in ${categoria}`,
        ),
      ]),
    ),
  ]);

  const activityRows = assertQuery(
    publishedActivitiesResult,
    "Failed to list published actividades",
  ).data ?? [];
  const enrollmentByActivity = await Promise.all(
    activityRows.map(async (activity) => ({
      label: activity.titulo,
      value: await countRows(
        admin
          .from("inscripciones")
          .select("id_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)", {
            count: "exact",
            head: true,
          })
          .eq("id_actividad", activity.id_actividad)
          .eq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CONFIRMADA),
        `Failed to count inscripciones for actividad ${activity.id_actividad}`,
      ),
    })),
  );

  return {
    totalContents,
    publishedContents,
    publishedActivities: activityRows.length,
    totalEnrollments,
    publishedMuseumPieces,
    contentSlices: buildCategorySlices(
      Object.fromEntries(contentTypeCounts),
      CONTENT_TYPE_LABELS,
      CONTENT_TYPE_COLORS,
    ),
    museumSlices: buildCategorySlices(
      Object.fromEntries(museumCategoryCounts),
      MUSEUM_CATEGORY_LABELS,
      MUSEUM_CATEGORY_COLORS,
    ),
    enrollmentsByActivity: enrollmentByActivity
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
      .slice(0, 5),
    monthlyEnrollments,
  };
}
