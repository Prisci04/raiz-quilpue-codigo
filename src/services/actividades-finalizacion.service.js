import "server-only";

import { todayISO } from "@/lib/actividades";
import {
  findCatalogoByNombre,
  NOMBRE_ESTADO_FINALIZADA,
  NOMBRE_ESTADO_PUBLICADA,
} from "@/lib/catalogos.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCatalogo } from "@/services/catalogos.service";
import { programarActualizacionModelo } from "@/services/ml-modelo.service";

function assertQuery(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function idEstadoPublicacion(nombre) {
  const item = findCatalogoByNombre(await listCatalogo("estado_publicacion"), nombre);
  if (!item) {
    throw new Error(`Missing estado_publicacion: ${nombre}`);
  }
  return item.id;
}

/**
 * Marca como Finalizada las actividades Publicada cuya fecha ya quedó en el pasado
 * (America/Santiago): se finalizan al día siguiente del evento.
 * No modifica inscripciones: Confirmada y Lista de espera se conservan con su estado.
 * Idempotente. Se llama al leer listados/detalle en el servidor.
 */
export async function finalizarActividadesVencidas(now = new Date()) {
  const hoy = todayISO(now);
  const [idPublicada, idFinalizada] = await Promise.all([
    idEstadoPublicacion(NOMBRE_ESTADO_PUBLICADA),
    idEstadoPublicacion(NOMBRE_ESTADO_FINALIZADA),
  ]);

  const rows =
    assertQuery(
      await getSupabaseAdminClient()
        .from("actividades")
        .select("id_actividad")
        .eq("id_estado", idPublicada)
        .lt("fecha", hoy),
      "Failed to list actividades a finalizar",
    ) ?? [];

  const ids = rows
    .map((row) => row.id_actividad)
    .filter((id) => Number.isInteger(id));

  if (!ids.length) {
    return { updated: 0, ids: [] };
  }

  assertQuery(
    await getSupabaseAdminClient()
      .from("actividades")
      .update({ id_estado: idFinalizada, fec_actualizacion: now.toISOString() })
      .in("id_actividad", ids)
      .eq("id_estado", idPublicada)
      .select("id_actividad"),
    "Failed to finalize actividades",
  );

  // No bloquea la finalización: el host Python decide si reentrena (huella).
  programarActualizacionModelo("finalizacion");

  return { updated: ids.length, ids };
}
