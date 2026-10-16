import "server-only";

import { isActividadPasada } from "@/lib/actividades";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deleteOwnedPortada } from "@/services/storage.service";

const ACTIVIDAD_COLUMNS =
  "id,titulo,descripcion,fecha,hora_inicio,hora_fin,lugar,publico_objetivo,modalidad,tipo_participacion,cupos,tipo_valor,valor_monto,forma_pago,informacion_adicional,imagen_url,estado,fecha_creacion,fecha_actualizacion";

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

async function countInscritosAdmin(ids) {
  const counts = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return counts;

  const data = assertQuery(
    await admin()
      .from("actividad_inscripciones")
      .select("actividad_id")
      .in("actividad_id", ids),
    "Failed to count inscripciones",
  );

  for (const row of data ?? []) {
    counts.set(row.actividad_id, (counts.get(row.actividad_id) ?? 0) + 1);
  }

  return counts;
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

  const rows = data ?? [];
  const counts = await countInscritosAdmin(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    inscritos: counts.get(row.id) ?? 0,
  }));
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
  if (id) {
    const current = await getActividadAdmin(id);
    if (!current) return null;

    const data = assertQuery(
      await admin()
        .from("actividades")
        .update(input)
        .eq("id", id)
        .select(ACTIVIDAD_COLUMNS)
        .maybeSingle(),
      "Failed to save actividad",
    );

    if (!data) return null;

    if (input.imagen_url !== undefined && current.imagen_url !== input.imagen_url) {
      await deleteOwnedPortada(current.imagen_url);
    }

    return data;
  }

  return assertQuery(
    await admin()
      .from("actividades")
      .insert(input)
      .select(ACTIVIDAD_COLUMNS)
      .single(),
    "Failed to save actividad",
  );
}

export async function saveActividadEstadoAdmin(id, estado) {
  const current = await getActividadAdmin(id);
  if (!current) return null;

  return assertQuery(
    await admin()
      .from("actividades")
      .update({ estado })
      .eq("id", id)
      .select(ACTIVIDAD_COLUMNS)
      .maybeSingle(),
    "Failed to save actividad estado",
  );
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

export async function deletePiezaMuseoAdmin(id) {
  const current = await getPiezaMuseoAdmin(id);
  if (!current) return null;

  const aportesRelacionados = assertQuery(
    await admin()
      .from("museo_aportes")
      .select("id")
      .eq("pieza_id", id),
    "Failed to list museo aportes linked to pieza",
  );

  if (aportesRelacionados?.length) {
    assertQuery(
      await admin()
        .from("museo_aportes")
        .update({
          estado_revision: "pendiente",
          pieza_id: null,
        })
        .eq("pieza_id", id),
      "Failed to restore museo aportes linked to pieza",
    );
  }

  assertQuery(
    await admin()
      .from("museo_piezas")
      .delete()
      .eq("id", id),
    "Failed to delete museo pieza",
  );

  await deleteOwnedPortada(current.imagen_url);
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
  const aporte = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(
        "id,archivo_url,estado_revision,pieza_id",
      )
      .eq("id", id)
      .single(),
    "Failed to get museo aporte before delete",
  );

  if (!aporte) {
    return;
  }

  if (
    aporte.estado_revision === "convertido" &&
    aporte.pieza_id
  ) {
    throw new Error(
      "No puedes eliminar un aporte mientras tenga una pieza asociada.",
    );
  }

  assertQuery(
    await admin()
      .from("museo_aportes")
      .delete()
      .eq("id", id),
    "Failed to delete museo aporte",
  );

  if (!aporte.archivo_url) {
    return;
  }

  try {
    const url = new URL(aporte.archivo_url);

    const marker =
      "/storage/v1/object/public/public-media/";

    const markerIndex =
      url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return;
    }

    const storagePath = decodeURIComponent(
      url.pathname.slice(
        markerIndex + marker.length,
      ),
    );

    if (
      !storagePath.startsWith(
        "museo/aportes/",
      )
    ) {
      return;
    }

    const { error } = await admin()
      .storage
      .from("public-media")
      .remove([storagePath]);

    if (error) {
      console.error(
        "Failed to delete museo aporte file:",
        error.message,
      );
    }
  } catch (error) {
    console.error(
      "Failed to resolve museo aporte storage path:",
      error,
    );
  }
}

/* =========================
   CONVERTIR APORTE A BORRADOR
========================= */

export async function convertirAporteEnBorradorAdmin(id) {
  const aporte = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(
        "id,titulo,descripcion,categoria,fecha_aproximada,lugar,archivo_nombre,archivo_url,estado_revision,pieza_id",
      )
      .eq("id", id)
      .single(),
    "Failed to get museo aporte for conversion",
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

  const archivoNombre =
    aporte.archivo_nombre?.toLowerCase() || "";

  const esImagen =
    archivoNombre.endsWith(".jpg") ||
    archivoNombre.endsWith(".jpeg") ||
    archivoNombre.endsWith(".png") ||
    archivoNombre.endsWith(".webp") ||
    archivoNombre.endsWith(".avif");

  const pieza = assertQuery(
    await admin()
      .from("museo_piezas")
      .insert({
        titulo: aporte.titulo,
        descripcion: aporte.descripcion,
        categoria: aporte.categoria,
        fecha_aproximada:
          aporte.fecha_aproximada,
        lugar: aporte.lugar,

        archivo_nombre:
          aporte.archivo_nombre,

        archivo_url:
          aporte.archivo_url,

        imagen_url:
          esImagen && aporte.archivo_url
            ? aporte.archivo_url
            : null,

        estado: "borrador",
      })
      .select(PIEZA_COLUMNS)
      .single(),
    "Failed to create museo pieza from aporte",
  );

  assertQuery(
    await admin()
      .from("museo_aportes")
      .update({
        estado_revision: "convertido",
        pieza_id: pieza.id,
      })
      .eq("id", id),
    "Failed to mark museo aporte as converted",
  );

  return {
    pieza,
  };
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

  assertQuery(
    await admin()
      .from("museo_aportes")
      .update({
        estado_revision: "rechazado",
        pieza_id: null,
      })
      .eq("id", id),
    "Failed to reject museo aporte",
  );

  return {
    rechazado: true,
  };
}