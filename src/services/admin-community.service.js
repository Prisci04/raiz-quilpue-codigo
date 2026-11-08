import "server-only";

import { actividadUbicacionColumns, readActividadUbicacion, writeActividadUbicacion } from "@/services/actividad-ubicacion.service";

import { MuseoIntegrityError } from "@/lib/museo/errors.mjs";
import { parseOwnedAporteFileUrl, parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import { logInternalError } from "@/lib/http";
import { deleteImage } from "@/services/storage.service";
import { isActividadPasada } from "@/lib/actividades";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deleteOwnedPortada } from "@/services/storage.service";

const ACTIVIDAD_COLUMNS =
  "id,titulo,descripcion,fecha,hora_inicio,hora_fin,lugar,publico_objetivo,modalidad,tipo_participacion,cupos,tipo_valor,valor_monto,forma_pago,informacion_adicional,imagen_url,estado,fecha_creacion,fecha_actualizacion";

const ACTIVIDAD_LIST_COLUMNS =
  "id,titulo,descripcion,fecha,lugar,modalidad,estado,imagen_url";

const PIEZA_COLUMNS =
  "id,titulo,descripcion,categoria,fecha_aproximada,lugar,imagen_url,archivo_nombre,archivo_url,estado,fecha_creacion";

function assertQuery(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result.data;
}

function admin() {
  return getSupabaseAdminClient();
}

/* =========================
   ACTIVIDADES
========================= */

export async function listActividadesAdmin() {
  const data = assertQuery(
    await admin()
      .from("actividades")
      .select(ACTIVIDAD_LIST_COLUMNS)
      .order("fecha", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false }),
    "Failed to list actividades",
  );

  return data ?? [];
}

export async function getActividadAdmin(id) {
  const row = assertQuery(
    await readActividadUbicacion((withLocation) => admin().from("actividades")
      .select(ACTIVIDAD_COLUMNS + actividadUbicacionColumns(withLocation))
      .eq("id", id).maybeSingle()),
    "Failed to get actividad",
  );
  return row ? { ...row, direccion: row.direccion ?? null, google_place_id: row.google_place_id ?? null,
    latitud: row.latitud ?? null, longitud: row.longitud ?? null } : null;
}

export async function countParticipantesAdmin(actividadId) {
  const result = await admin()
    .from("actividad_inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("actividad_id", actividadId);

  if (result.error) {
    throw new Error(`Failed to count participantes: ${result.error.message}`);
  }

  return result.count ?? 0;
}

export async function saveActividadAdmin(id, input) {
  const current = id ? await getActividadAdmin(id) : null;
  if (id && !current) return null;
  const result = await writeActividadUbicacion((withLocation, payload) => {
    const query = admin().from("actividades");
    const mutation = id ? query.update(payload).eq("id", id) : query.insert(payload);
    const selected = mutation.select(ACTIVIDAD_COLUMNS + actividadUbicacionColumns(withLocation));
    return id ? selected.maybeSingle() : selected.single();
  }, input);
  const data = assertQuery(result, "Failed to save actividad");
  if (!data) return null;
  if (current && input.imagen_url !== undefined && current.imagen_url !== input.imagen_url) {
    await deleteOwnedPortada(current.imagen_url);
  }
  return { ...data, direccion: data.direccion ?? null, google_place_id: data.google_place_id ?? null };
}

export async function saveActividadEstadoAdmin(id, estado) {
  const current = await getActividadAdmin(id);
  if (!current) return null;
  const data = assertQuery(
    await readActividadUbicacion((withLocation) => admin().from("actividades")
      .update({ estado }).eq("id", id)
      .select(ACTIVIDAD_COLUMNS + actividadUbicacionColumns(withLocation)).maybeSingle()),
    "Failed to save actividad estado",
  );
  return data ? { ...data, direccion: data.direccion ?? null, google_place_id: data.google_place_id ?? null } : null;
}

export async function deleteActividadAdmin(id) {
  const current = await getActividadAdmin(id);
  if (!current) return null;

  assertQuery(
    await admin()
      .from("actividades")
      .delete()
      .eq("id", id),
    "Failed to delete actividad",
  );

  await deleteOwnedPortada(current.imagen_url);
  return true;
}

/* =========================
   PARTICIPANTES
========================= */

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
  const rpc = await admin().rpc("inscribir_actividad", {
    p_actividad_id: actividadId,
    p_nombre: input.nombre,
    p_apellido: input.apellido,
    p_email: input.email,
    p_telefono: input.telefono,
  });

  if (!rpc.error) {
    if (rpc.data?.error) return { error: rpc.data.error };
    return rpc.data;
  }

  const missingFn =
    rpc.error.code === "PGRST202" ||
    /inscribir_actividad/i.test(rpc.error.message ?? "");

  if (!missingFn) {
    if (rpc.error.code === "23505") return { error: "ALREADY_REGISTERED" };
    if (rpc.error.code === "23514") return { error: "INVALID_CONTACT" };
    throw new Error(`Failed to create inscripcion: ${rpc.error.message}`);
  }

  const actividad = assertQuery(
    await getSupabaseServerClient()
      .from("actividades")
      .select("id,estado,tipo_participacion,cupos,fecha")
      .eq("id", actividadId)
      .eq("estado", "publicada")
      .maybeSingle(),
    "Failed to verify actividad",
  );

  if (!actividad || actividad.tipo_participacion !== "inscripcion") {
    return { error: "ACTIVITY_UNAVAILABLE" };
  }

  if (isActividadPasada(actividad.fecha)) {
    return { error: "ACTIVITY_ENDED" };
  }

  const { count, error: countError } = await admin()
    .from("actividad_inscripciones")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("actividad_id", actividadId);

  if (countError) {
    throw new Error("Failed to count inscripciones");
  }

  if (Number.isInteger(actividad.cupos) && (count ?? 0) >= actividad.cupos) {
    return { error: "NO_PLACES" };
  }

  const existing = await admin()
    .from("actividad_inscripciones")
    .select("id")
    .eq("actividad_id", actividadId)
    .ilike("email", input.email)
    .maybeSingle();

  if (existing.data) {
    return { error: "ALREADY_REGISTERED" };
  }

  const inserted = await admin()
    .from("actividad_inscripciones")
    .insert({
      ...input,
      actividad_id: actividadId,
    })
    .select("id")
    .single();

  if (inserted.error?.code === "23505") {
    return { error: "ALREADY_REGISTERED" };
  }
  if (inserted.error?.code === "23514") {
    return { error: "INVALID_CONTACT" };
  }

  const row = assertQuery(inserted, "Failed to create inscripcion");

  if (!Number.isInteger(actividad.cupos)) {
    return row;
  }

  const listed = assertQuery(
    await admin()
      .from("actividad_inscripciones")
      .select("id")
      .eq("actividad_id", actividadId)
      .order("id", { ascending: true }),
    "Failed to list inscripciones after insert",
  );

  const kept = new Set((listed ?? []).slice(0, actividad.cupos).map((item) => item.id));
  if (kept.has(row.id)) {
    return row;
  }

  await admin().from("actividad_inscripciones").delete().eq("id", row.id);
  return { error: "NO_PLACES" };
}

export async function deleteParticipanteAdmin(actividadId, inscripcionId) {
  const data = assertQuery(
    await admin()
      .from("actividad_inscripciones")
      .delete()
      .eq("id", inscripcionId)
      .eq("actividad_id", actividadId)
      .select("id")
      .maybeSingle(),
    "Failed to delete inscripcion",
  );

  return data ?? null;
}

/* =========================
   MUSEO DIGITAL - PIEZAS
========================= */

export async function listPiezasMuseoAdmin() {
  const data = assertQuery(
    await admin()
      .from("museo_piezas")
      .select(PIEZA_COLUMNS)
      .order("fecha_creacion", {
        ascending: false,
      }),
    "Failed to list museo piezas",
  );

  return data ?? [];
}

export async function getPiezaMuseoAdmin(id) {
  return assertQuery(
    await admin()
      .from("museo_piezas")
      .select(PIEZA_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    "Failed to get museo pieza",
  );
}

export async function savePiezaMuseoAdmin(id, input) {
  if (id) {
    const current = await getPiezaMuseoAdmin(id);
    if (!current) return null;

    const data = assertQuery(
      await admin()
        .from("museo_piezas")
        .update(input)
        .eq("id", id)
        .select(PIEZA_COLUMNS)
        .maybeSingle(),
      "Failed to save museo pieza",
    );

    if (!data) return null;

    if (input.imagen_url !== undefined && current.imagen_url !== input.imagen_url) {
      await deleteOwnedPortada(current.imagen_url);
    }

    return data;
  }

  return assertQuery(
    await admin()
      .from("museo_piezas")
      .insert(input)
      .select(PIEZA_COLUMNS)
      .single(),
    "Failed to save museo pieza",
  );
}

async function museoRpc(name, params) {
  const { data, error } = await admin().rpc(name, params);
  if (error) {
    if (["PGRST202", "42883", "42501"].includes(error.code)) throw new MuseoIntegrityError();
    throw new Error("Museo transaction failed");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid Museo transaction result");
  return data;
}

export async function deletePiezaMuseoAdmin(id) {
  const result = await museoRpc("eliminar_pieza_museo", { p_pieza_id: id });
  if (!result.eliminado) return null;
  // Original contribution files remain available for the restored pending aporte.
  const owned = parseOwnedPortadaUrl(result.pieza?.imagen_url);
  if (owned?.contexto === "museo" && owned.registroId === Number(id)) {
    await deleteOwnedPortada(result.pieza.imagen_url);
  }
  return true;
}

export async function listPiezasMuseoPublicas() {
  const data = assertQuery(
    await getSupabaseServerClient()
      .from("museo_piezas")
      .select(PIEZA_COLUMNS)
      .eq("estado", "publicada")
      .order("fecha_creacion", {
        ascending: false,
      }),
    "Failed to list public museo piezas",
  );

  return data ?? [];
}

/* =========================
   MUSEO DIGITAL - APORTES
========================= */

export async function createAporteMuseo(input) {
  return assertQuery(
    await admin()
      .from("museo_aportes")
      .insert(input)
      .select("id")
      .single(),
    "Failed to create museo aporte",
  );
}

export async function listAportesMuseoAdmin() {
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(
        "id,nombre,correo,categoria,titulo,descripcion,fecha_aproximada,lugar,archivo_nombre,archivo_url,estado_revision,pieza_id,informacion_adicional,fecha_creacion",
      )
      .order("fecha_creacion", {
        ascending: false,
      }),
    "Failed to list museo aportes",
  );

  return data ?? [];
}

export async function countAportesMuseoAdmin() {
  const { count, error } = await admin()
    .from("museo_aportes")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to count museo aportes: ${error.message}`);
  }

  if (!Number.isInteger(count)) {
    throw new Error("Supabase did not return an exact museo aportes count.");
  }

  return count;
}

export async function deleteAporteMuseoAdmin(id) {
  const result = await museoRpc("eliminar_aporte_museo", { p_aporte_id: id });
  if (!result.eliminado || result.conservar_archivo !== false || !result.archivo_url) return;
  const owned = parseOwnedAporteFileUrl(result.archivo_url);
  if (!owned) return;
  // DB already committed. Storage cleanup is best effort, never a DB rollback.
  try {
    await deleteImage(owned.path);
  } catch {
    logInternalError("museo aporte cleanup pending");
  }
}

export async function convertirAporteEnBorradorAdmin(id) {
  return museoRpc("convertir_aporte_museo", { p_aporte_id: id });
}

export async function rechazarAporteMuseoAdmin(id) {
  const aporte = assertQuery(
    await admin()
      .from("museo_aportes")
      .select("id,estado_revision,pieza_id")
      .eq("id", id)
      .maybeSingle(),
    "Failed to get museo aporte for rejection",
  );

  if (!aporte) {
    return {
      error: "NOT_FOUND",
    };
  }

  if (
    aporte.estado_revision !== "pendiente" ||
    aporte.pieza_id
  ) {
    return {
      error: "ALREADY_PROCESSED",
    };
  }

  const rejected = assertQuery(
    await admin()
      .from("museo_aportes")
      .update({
        estado_revision: "rechazado",
        pieza_id: null,
      })
      .eq("id", id)
      .eq("estado_revision", "pendiente")
      .is("pieza_id", null)
      .select("id")
      .maybeSingle(),
    "Failed to reject museo aporte",
  );

  if (!rejected) return { error: "ALREADY_PROCESSED" };

  return {
    rechazado: true,
  };
}
