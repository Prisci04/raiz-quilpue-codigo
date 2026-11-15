import "server-only";

import {
  NOMBRE_ESTADO_FINALIZADA,
  NOMBRE_INSCRIPCION_CANCELADA,
  NOMBRE_INSCRIPCION_CONFIRMADA,
  NOMBRE_INSCRIPCION_ESPERA,
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

function monthLabel(year, monthIndex) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "short",
    year: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(Date.UTC(year, monthIndex, 15)));
}

/**
 * Estadísticas organizacionales (sin métricas técnicas de ML).
 */
export async function getAdminEstadisticas() {
  const admin = getSupabaseAdminClient();

  const nowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const yearNow = Number(nowParts.find((p) => p.type === "year")?.value);
  const monthNow = Number(nowParts.find((p) => p.type === "month")?.value);
  const months = Array.from({ length: MONTH_COUNT }, (_, offset) => {
    const monthDate = new Date(Date.UTC(yearNow, monthNow - 1 - (MONTH_COUNT - 1 - offset), 1));
    return {
      year: monthDate.getUTCFullYear(),
      monthIndex: monthDate.getUTCMonth(),
    };
  });

  const [
    actividadesRealizadas,
    totalConfirmadas,
    totalEspera,
    totalCanceladas,
    finalizadasResult,
    monthlyConfirmadas,
  ] = await Promise.all([
    countRows(
      admin
        .from("actividades")
        .select("id_actividad,estado_publicacion!inner(nombre_estado)", {
          count: "exact",
          head: true,
        })
        .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_FINALIZADA),
      "Failed to count actividades finalizadas",
    ),
    countRows(
      admin
        .from("inscripciones")
        .select("id_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)", {
          count: "exact",
          head: true,
        })
        .eq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CONFIRMADA),
      "Failed to count confirmadas",
    ),
    countRows(
      admin
        .from("inscripciones")
        .select("id_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)", {
          count: "exact",
          head: true,
        })
        .eq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_ESPERA),
      "Failed to count lista de espera",
    ),
    countRows(
      admin
        .from("inscripciones")
        .select("id_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)", {
          count: "exact",
          head: true,
        })
        .eq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CANCELADA),
      "Failed to count canceladas",
    ),
    admin
      .from("actividades")
      .select("id_actividad,titulo,estado_publicacion!inner(nombre_estado)")
      .eq("estado_publicacion.nombre_estado", NOMBRE_ESTADO_FINALIZADA)
      .order("fecha", { ascending: false }),
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
          "Failed to count monthly confirmadas",
        );
        return { label: monthLabel(year, monthIndex), value };
      }),
    ),
  ]);

  const finalizadas = assertQuery(finalizadasResult, "Failed to list finalizadas").data ?? [];

  const porActividad = await Promise.all(
    finalizadas.map(async (activity) => ({
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
        `Failed to count confirmadas actividad ${activity.id_actividad}`,
      ),
    })),
  );

  return {
    actividadesRealizadas,
    totalConfirmadas,
    topActividades: porActividad
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"))
      .slice(0, 8),
    mensualConfirmadas: monthlyConfirmadas,
    distribucionEstados: [
      { id: "confirmada", label: "Confirmadas", value: totalConfirmadas, color: "#1e4536" },
      { id: "espera", label: "Lista de espera", value: totalEspera, color: "#c4a04a" },
      { id: "cancelada", label: "Canceladas", value: totalCanceladas, color: "#a5452d" },
    ],
  };
}
