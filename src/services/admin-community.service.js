import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    ? await admin()
        .from("actividades")
        .update(row)
        .eq("id", id)
        .select(ACTIVIDAD_COLUMNS)
        .single()
    : await admin()
        .from("actividades")
        .insert(row)
        .select(ACTIVIDAD_COLUMNS)
        .single();

  return assertQuery(result, "Failed to save actividad");
}

export async function deleteActividadAdmin(id) {
  assertQuery(
    await admin()
      .from("actividades")
      .delete()
      .eq("id", id),
    "Failed to delete actividad",
  );
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
  const actividad = assertQuery(
    await getSupabaseServerClient()
      .from("actividades")
      .select("id,estado,tipo_participacion,cupos")
      .eq("id", actividadId)
      .eq("estado", "publicada")
      .maybeSingle(),
    "Failed to verify actividad",
  );

  if (
    !actividad ||
    actividad.tipo_participacion !== "inscripcion"
  ) {
    return { error: "ACTIVITY_UNAVAILABLE" };
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

  if (
    Number.isInteger(actividad.cupos) &&
    (count ?? 0) >= actividad.cupos
  ) {
    return { error: "NO_PLACES" };
  }

  return assertQuery(
    await admin()
      .from("actividad_inscripciones")
      .insert({
        ...input,
        actividad_id: actividadId,
      })
      .select("id")
      .single(),
    "Failed to create inscripcion",
  );
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
  const result = id
    ? await admin()
        .from("museo_piezas")
        .update(input)
        .eq("id", id)
        .select(PIEZA_COLUMNS)
        .single()
    : await admin()
        .from("museo_piezas")
        .insert(input)
        .select(PIEZA_COLUMNS)
        .single();

  return assertQuery(
    result,
    "Failed to save museo pieza",
  );
}

export async function deletePiezaMuseoAdmin(id) {
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

export async function deleteAporteMuseoAdmin(id) {
  const aporte = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(
        "id,archivo_url,pieza_id",
      )
      .eq("id", id)
      .single(),
    "Failed to get museo aporte before delete",
  );

  if (!aporte) {
    return;
  }

  assertQuery(
    await admin()
      .from("museo_aportes")
      .delete()
      .eq("id", id),
    "Failed to delete museo aporte",
  );

  // La pieza conserva el archivo compartido aunque se elimine el aporte original.
  if (aporte.pieza_id || !aporte.archivo_url) {
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