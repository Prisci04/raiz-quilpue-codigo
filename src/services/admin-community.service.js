import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVIDAD_COLUMNS =
  "id,titulo,descripcion,fecha,hora_inicio,hora_fin,lugar,publico_objetivo,modalidad,tipo_participacion,cupos,tipo_valor,valor_monto,forma_pago,informacion_adicional,imagen_url,estado,fecha_creacion,fecha_actualizacion";
const PIEZA_COLUMNS =
  "id,titulo,descripcion,categoria,fecha_aproximada,lugar,imagen_url,estado,fecha_creacion";

function assertQuery(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result.data;
}

function admin() {
  return getSupabaseAdminClient();
}

export async function listActividadesAdmin() {
  const data = assertQuery(
    await admin()
      .from("actividades")
      .select(ACTIVIDAD_COLUMNS)
      .order("fecha", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false }),
    "Failed to list actividades",
  );
  return data ?? [];
}

export async function getActividadAdmin(id) {
  return assertQuery(
    await admin()
      .from("actividades")
      .select(ACTIVIDAD_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    "Failed to get actividad",
  );
}

export async function saveActividadAdmin(id, input) {
  const row = { ...input };
  const result = id
    ? await admin().from("actividades").update(row).eq("id", id).select(ACTIVIDAD_COLUMNS).single()
    : await admin().from("actividades").insert(row).select(ACTIVIDAD_COLUMNS).single();
  return assertQuery(result, "Failed to save actividad");
}

export async function deleteActividadAdmin(id) {
  assertQuery(await admin().from("actividades").delete().eq("id", id), "Failed to delete actividad");
}

export async function listParticipantesAdmin(actividadId) {
  const data = assertQuery(
    await admin()
      .from("actividad_inscripciones")
      .select("id,nombre,apellido,email,telefono,fecha_creacion")
      .eq("actividad_id", actividadId)
      .order("fecha_creacion", { ascending: false }),
    "Failed to list participantes",
  );
  return data ?? [];
}

export async function crearInscripcion(actividadId, input) {
  const actividad = assertQuery(
    await getSupabaseServerClient()
      .from("actividades")
      .select("id,estado,tipo_participacion,cupos")
      .eq("id", actividadId)
      .eq("estado", "publicada")
      .maybeSingle(),
    "Failed to verify actividad",
  );
  if (!actividad || actividad.tipo_participacion !== "inscripcion") {
    return { error: "ACTIVITY_UNAVAILABLE" };
  }

  const { count, error: countError } = await admin()
    .from("actividad_inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("actividad_id", actividadId);
  if (countError) throw new Error("Failed to count inscripciones");
  if (Number.isInteger(actividad.cupos) && (count ?? 0) >= actividad.cupos) {
    return { error: "NO_PLACES" };
  }

  return assertQuery(
    await admin()
      .from("actividad_inscripciones")
      .insert({ ...input, actividad_id: actividadId })
      .select("id")
      .single(),
    "Failed to create inscripcion",
  );
}

export async function listPiezasMuseoAdmin() {
  const data = assertQuery(
    await admin()
      .from("museo_piezas")
      .select(PIEZA_COLUMNS)
      .order("fecha_creacion", { ascending: false }),
    "Failed to list museo piezas",
  );
  return data ?? [];
}

export async function getPiezaMuseoAdmin(id) {
  return assertQuery(
    await admin().from("museo_piezas").select(PIEZA_COLUMNS).eq("id", id).maybeSingle(),
    "Failed to get museo pieza",
  );
}

export async function savePiezaMuseoAdmin(id, input) {
  const result = id
    ? await admin().from("museo_piezas").update(input).eq("id", id).select(PIEZA_COLUMNS).single()
    : await admin().from("museo_piezas").insert(input).select(PIEZA_COLUMNS).single();
  return assertQuery(result, "Failed to save museo pieza");
}

export async function deletePiezaMuseoAdmin(id) {
  assertQuery(await admin().from("museo_piezas").delete().eq("id", id), "Failed to delete museo pieza");
}

export async function listPiezasMuseoPublicas() {
  const data = assertQuery(
    await getSupabaseServerClient()
      .from("museo_piezas")
      .select(PIEZA_COLUMNS)
      .eq("estado", "publicada")
      .order("fecha_creacion", { ascending: false }),
    "Failed to list public museo piezas",
  );
  return data ?? [];
}

export async function createAporteMuseo(input) {
  return assertQuery(
    await admin().from("museo_aportes").insert(input).select("id").single(),
    "Failed to create museo aporte",
  );
}

export async function listAportesMuseoAdmin() {
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .select("id,nombre,correo,categoria,titulo,descripcion,fecha_aproximada,lugar,archivo_nombre,informacion_adicional,fecha_creacion")
      .order("fecha_creacion", { ascending: false }),
    "Failed to list museo aportes",
  );
  return data ?? [];
}

export async function deleteAporteMuseoAdmin(id) {
  assertQuery(await admin().from("museo_aportes").delete().eq("id", id), "Failed to delete museo aporte");
}
