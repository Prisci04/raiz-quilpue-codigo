import "server-only";

import { parseOwnedAporteImageUrl, parseOwnedPortadaUrl } from "@/lib/media/policy.mjs";
import { logInternalError } from "@/lib/http";
import { deleteImage } from "@/services/storage.service";
import { mapAporteMuseo, mapAporteMuseoPublico } from "@/lib/museo";
import {
  capacidadInscripcion,
  esParticipacionInscripcion,
  isActividadPasada,
  mapActividadVista,
} from "@/lib/actividades";
import {
  findCatalogoByNombre,
  mismoNombreCatalogo,
  NOMBRE_INSCRIPCION_CANCELADA,
  NOMBRE_INSCRIPCION_CONFIRMADA,
  NOMBRE_INSCRIPCION_ESPERA,
  NOMBRE_REVISION_APROBADO,
  NOMBRE_REVISION_PENDIENTE,
  NOMBRE_REVISION_RECHAZADO,
} from "@/lib/catalogos.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listCatalogo } from "@/services/catalogos.service";
import { resolveLugarForActividad } from "@/services/lugares.service";
import { deleteOwnedPortada } from "@/services/storage.service";

const ACTIVIDAD_COLUMNS = `
  id_actividad,
  titulo,
  descripcion,
  fecha,
  hora_inicio,
  hora_fin,
  cupos_max,
  cupos_espera,
  valor_monto,
  informacion_adicional,
  imagen_url,
  fec_creacion,
  fec_actualizacion,
  id_modalidad,
  id_tipo_participacion,
  id_publico,
  id_costo,
  id_lugar,
  id_estado,
  id_usuario_creador,
  modalidad ( id_modalidad, nombre_modalidad ),
  tipo_participacion ( id_tipo_participacion, nombre_tipo_participacion ),
  publico_objetivo ( id_publico, nombre_publico ),
  costo_actividad ( id_costo, nombre_costo ),
  estado_publicacion ( id_estado, nombre_estado ),
  lugar (
    id_lugar,
    nombre_lugar,
    direccion,
    id_comuna,
    comuna (
      id_comuna,
      nombre_comuna,
      id_region,
      region (
        id_region,
        nombre_region
      )
    )
  )
`;

const ACTIVIDAD_LIST_COLUMNS = ACTIVIDAD_COLUMNS;

const APORTE_BASE_COLUMNS = `
  id_aporte,
  nombre_aportante,
  correo_aportante,
  titulo,
  descripcion,
  fecha_aproximada,
  lugar_referencia,
  imagen_url,
  fec_creacion,
  fec_revision,
  id_categoria_museo,
  id_estado_revision,
  id_usuario_revisor,
  categoria_museo ( nombre_categoria )
`;
const APORTE_COLUMNS = `${APORTE_BASE_COLUMNS},estado_revision ( nombre_estado_revision )`;
const APORTE_APROBADOS_COLUMNS = `${APORTE_BASE_COLUMNS},estado_revision!inner ( nombre_estado_revision )`;

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
      .order("id_actividad", { ascending: false }),
    "Failed to list actividades",
  );

  return (data ?? []).map(mapActividadVista);
}

export async function getActividadAdmin(id) {
  const data = assertQuery(
    await admin()
      .from("actividades")
      .select(ACTIVIDAD_COLUMNS)
      .eq("id_actividad", id)
      .maybeSingle(),
    "Failed to get actividad",
  );

  return mapActividadVista(data);
}

export async function countParticipantesAdmin(actividadId) {
  const result = await admin()
    .from("inscripciones")
    .select("id_inscripcion, estado_inscripcion!inner(nombre_estado_inscripcion)", {
      count: "exact",
      head: true,
    })
    .eq("id_actividad", actividadId)
    .neq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CANCELADA);

  if (result.error) {
    throw new Error(`Failed to count participantes: ${result.error.message}`);
  }

  return result.count ?? 0;
}

function actividadWritePayload(input, { usuarioId, isCreate }) {
  const payload = {
    titulo: input.titulo,
    descripcion: input.descripcion,
    fecha: input.fecha,
    hora_inicio: input.hora_inicio,
    hora_fin: input.hora_fin,
    cupos_max: input.cupos_max,
    cupos_espera: input.cupos_espera ?? 0,
    valor_monto: input.valor_monto,
    informacion_adicional: input.informacion_adicional,
    imagen_url: input.imagen_url,
    id_modalidad: input.id_modalidad,
    id_tipo_participacion: input.id_tipo_participacion,
    id_publico: input.id_publico,
    id_costo: input.id_costo,
    id_lugar: input.id_lugar,
    id_estado: input.id_estado,
    fec_actualizacion: new Date().toISOString(),
  };

  if (isCreate) {
    payload.id_usuario_creador = usuarioId;
  }

  return payload;
}

export async function saveActividadAdmin(id, input, usuarioId) {
  const resolved = { ...input };
  if (input.lugar) {
    resolved.id_lugar = await resolveLugarForActividad(input.lugar);
  }

  if (id) {
    const current = await getActividadAdmin(id);
    if (!current) return null;

    const data = assertQuery(
      await admin()
        .from("actividades")
        .update(actividadWritePayload(resolved, { usuarioId, isCreate: false }))
        .eq("id_actividad", id)
        .select(ACTIVIDAD_COLUMNS)
        .maybeSingle(),
      "Failed to save actividad",
    );

    if (!data) return null;

    if (input.imagen_url !== undefined && current.imagen_url !== input.imagen_url) {
      await deleteOwnedPortada(current.imagen_url);
    }

    return mapActividadVista(data);
  }

  const data = assertQuery(
    await admin()
      .from("actividades")
      .insert(actividadWritePayload(resolved, { usuarioId, isCreate: true }))
      .select(ACTIVIDAD_COLUMNS)
      .single(),
    "Failed to save actividad",
  );

  return mapActividadVista(data);
}

export async function saveActividadEstadoAdmin(id, idEstado) {
  const current = await getActividadAdmin(id);
  if (!current) return null;

  const data = assertQuery(
    await admin()
      .from("actividades")
      .update({
        id_estado: idEstado,
        fec_actualizacion: new Date().toISOString(),
      })
      .eq("id_actividad", id)
      .select(ACTIVIDAD_COLUMNS)
      .maybeSingle(),
    "Failed to save actividad estado",
  );

  return mapActividadVista(data);
}

export async function deleteActividadAdmin(id) {
  const current = await getActividadAdmin(id);
  if (!current) return null;

  assertQuery(
    await admin()
      .from("inscripciones")
      .delete()
      .eq("id_actividad", id),
    "Failed to delete inscripciones de actividad",
  );

  assertQuery(
    await admin()
      .from("actividades")
      .delete()
      .eq("id_actividad", id),
    "Failed to delete actividad",
  );

  await deleteOwnedPortada(current.imagen_url);
  return true;
}

/* =========================
   PARTICIPANTES
========================= */

function nestedEstadoInscripcion(row) {
  return Array.isArray(row?.estado_inscripcion) ? row.estado_inscripcion[0] : row?.estado_inscripcion;
}

function mapParticipante(row) {
  if (!row) return null;
  const estado = nestedEstadoInscripcion(row);
  const nombreEstado = estado?.nombre_estado_inscripcion ?? null;

  return {
    id: row.id_inscripcion,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.correo,
    telefono: row.telefono,
    fecha_creacion: row.fec_inscripcion,
    estado: nombreEstado,
    lista_espera: mismoNombreCatalogo(nombreEstado, NOMBRE_INSCRIPCION_ESPERA),
  };
}

async function estadosInscripcion() {
  return listCatalogo("estado_inscripcion", { admin: true });
}

async function idEstadoInscripcion(nombre) {
  const item = findCatalogoByNombre(await estadosInscripcion(), nombre);
  if (!item) {
    throw new Error(`Missing estado_inscripcion: ${nombre}`);
  }
  return item.id;
}

async function listInscripcionesActivas(actividadId) {
  return assertQuery(
    await admin()
      .from("inscripciones")
      .select(
        "id_inscripcion, fec_inscripcion, id_estado_inscripcion, estado_inscripcion!inner(nombre_estado_inscripcion)",
      )
      .eq("id_actividad", actividadId)
      .neq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CANCELADA)
      .order("fec_inscripcion", { ascending: true })
      .order("id_inscripcion", { ascending: true }),
    "Failed to list inscripciones",
  ) ?? [];
}

export async function listParticipantesAdmin(actividadId) {
  const data = assertQuery(
    await admin()
      .from("inscripciones")
      .select(
        "id_inscripcion,nombre,apellido,correo,telefono,fec_inscripcion,id_estado_inscripcion,estado_inscripcion!inner(nombre_estado_inscripcion)",
      )
      .eq("id_actividad", actividadId)
      .neq("estado_inscripcion.nombre_estado_inscripcion", NOMBRE_INSCRIPCION_CANCELADA)
      .order("fec_inscripcion", { ascending: false })
      .order("id_inscripcion", { ascending: false }),
    "Failed to list participantes",
  );

  return (data ?? []).map(mapParticipante);
}

export async function crearInscripcion(actividadId, input) {
  const actividad = assertQuery(
    await getSupabaseServerClient()
      .from("actividades")
      .select(
        "id_actividad,fecha,cupos_max,cupos_espera,tipo_participacion(nombre_tipo_participacion)",
      )
      .eq("id_actividad", actividadId)
      .maybeSingle(),
    "Failed to verify actividad",
  );

  const participacion = Array.isArray(actividad?.tipo_participacion)
    ? actividad.tipo_participacion[0]
    : actividad?.tipo_participacion;

  if (!actividad || !esParticipacionInscripcion(participacion?.nombre_tipo_participacion)) {
    return { error: "ACTIVITY_UNAVAILABLE" };
  }

  if (isActividadPasada(actividad.fecha)) {
    return { error: "ACTIVITY_ENDED" };
  }

  const cupos = actividad.cupos_max ?? null;
  const cuposEspera = actividad.cupos_espera ?? 0;
  const activos = await listInscripcionesActivas(actividadId);
  const capacidad = capacidadInscripcion(cupos, cuposEspera);

  if (capacidad !== null && activos.length >= capacidad) {
    return { error: "NO_PLACES" };
  }

  const confirmadas = activos.filter((row) =>
    mismoNombreCatalogo(
      nestedEstadoInscripcion(row)?.nombre_estado_inscripcion,
      NOMBRE_INSCRIPCION_CONFIRMADA,
    ),
  ).length;
  const enEspera = Number.isInteger(cupos) && confirmadas >= cupos;
  const idEstado = await idEstadoInscripcion(
    enEspera ? NOMBRE_INSCRIPCION_ESPERA : NOMBRE_INSCRIPCION_CONFIRMADA,
  );

  const inserted = await admin()
    .from("inscripciones")
    .insert({
      nombre: input.nombre,
      apellido: input.apellido,
      correo: input.email,
      telefono: input.telefono,
      id_actividad: actividadId,
      id_estado_inscripcion: idEstado,
    })
    .select("id_inscripcion")
    .single();

  if (inserted.error?.code === "23514") {
    return { error: "INVALID_CONTACT" };
  }

  const row = assertQuery(inserted, "Failed to create inscripcion");

  if (!Number.isInteger(cupos)) {
    return { id: row.id_inscripcion, lista_espera: false };
  }

  const listed = await listInscripcionesActivas(actividadId);
  const kept = new Set(listed.slice(0, capacidad).map((item) => item.id_inscripcion));
  if (!kept.has(row.id_inscripcion)) {
    await admin().from("inscripciones").delete().eq("id_inscripcion", row.id_inscripcion);
    return { error: "NO_PLACES" };
  }

  const position = listed.findIndex((item) => item.id_inscripcion === row.id_inscripcion);
  const listaEspera = position >= cupos;
  const reconciledId = await idEstadoInscripcion(
    listaEspera ? NOMBRE_INSCRIPCION_ESPERA : NOMBRE_INSCRIPCION_CONFIRMADA,
  );
  if (reconciledId !== idEstado) {
    await admin()
      .from("inscripciones")
      .update({ id_estado_inscripcion: reconciledId })
      .eq("id_inscripcion", row.id_inscripcion);
  }

  return { id: row.id_inscripcion, lista_espera: listaEspera };
}

export async function deleteParticipanteAdmin(actividadId, inscripcionId) {
  const current = assertQuery(
    await admin()
      .from("inscripciones")
      .select(
        "id_inscripcion,id_estado_inscripcion,estado_inscripcion(nombre_estado_inscripcion)",
      )
      .eq("id_inscripcion", inscripcionId)
      .eq("id_actividad", actividadId)
      .maybeSingle(),
    "Failed to get inscripcion",
  );

  if (!current) return null;

  assertQuery(
    await admin()
      .from("inscripciones")
      .delete()
      .eq("id_inscripcion", inscripcionId)
      .eq("id_actividad", actividadId),
    "Failed to delete inscripcion",
  );

  const eraConfirmada = mismoNombreCatalogo(
    nestedEstadoInscripcion(current)?.nombre_estado_inscripcion,
    NOMBRE_INSCRIPCION_CONFIRMADA,
  );

  if (eraConfirmada) {
    const espera = (await listInscripcionesActivas(actividadId)).find((row) =>
      mismoNombreCatalogo(
        nestedEstadoInscripcion(row)?.nombre_estado_inscripcion,
        NOMBRE_INSCRIPCION_ESPERA,
      ),
    );
    if (espera) {
      await admin()
        .from("inscripciones")
        .update({
          id_estado_inscripcion: await idEstadoInscripcion(NOMBRE_INSCRIPCION_CONFIRMADA),
        })
        .eq("id_inscripcion", espera.id_inscripcion);
    }
  }

  return { id: current.id_inscripcion };
}

/* =========================
   MUSEO DIGITAL
========================= */

async function idEstadoRevision(nombre) {
  const items = await listCatalogo("estado_revision", { admin: true });
  return findCatalogoByNombre(items, nombre)?.id ?? null;
}

async function cleanupAporteImage(url) {
  const ownedAporte = parseOwnedAporteImageUrl(url);
  if (ownedAporte) {
    try {
      await deleteImage(ownedAporte.path);
    } catch {
      logInternalError("museo aporte cleanup pending");
    }
    return;
  }

  const ownedPortada = parseOwnedPortadaUrl(url);
  if (ownedPortada?.contexto === "museo") {
    await deleteOwnedPortada(url);
  }
}

export async function listPiezasMuseoAdmin() {
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(APORTE_APROBADOS_COLUMNS)
      .eq("estado_revision.nombre_estado_revision", NOMBRE_REVISION_APROBADO)
      .order("fec_creacion", { ascending: false }),
    "Failed to list museo piezas",
  );

  return (data ?? []).map(mapAporteMuseo);
}

export async function getPiezaMuseoAdmin(id) {
  return mapAporteMuseo(
    assertQuery(
      await admin()
        .from("museo_aportes")
        .select(APORTE_COLUMNS)
        .eq("id_aporte", id)
        .maybeSingle(),
      "Failed to get museo pieza",
    ),
  );
}

export async function findAporteByImagenUrl(url) {
  if (!url) return null;

  return mapAporteMuseo(
    assertQuery(
      await admin()
        .from("museo_aportes")
        .select(APORTE_COLUMNS)
        .eq("imagen_url", url)
        .maybeSingle(),
      "Failed to find museo aporte by image",
    ),
  );
}

export async function savePiezaMuseoAdmin(id, input, usuario) {
  if (id) {
    const current = await getPiezaMuseoAdmin(id);
    if (!current) return null;

    const data = assertQuery(
      await admin()
        .from("museo_aportes")
        .update({
          titulo: input.titulo,
          descripcion: input.descripcion,
          fecha_aproximada: input.fecha_aproximada,
          lugar_referencia: input.lugar_referencia,
          imagen_url: input.imagen_url,
          id_categoria_museo: input.id_categoria_museo,
        })
        .eq("id_aporte", id)
        .select(APORTE_COLUMNS)
        .maybeSingle(),
      "Failed to save museo pieza",
    );

    if (!data) return null;

    if (current.imagen_url && current.imagen_url !== input.imagen_url) {
      await cleanupAporteImage(current.imagen_url);
    }

    return mapAporteMuseo(data);
  }

  const aprobadoId = await idEstadoRevision(NOMBRE_REVISION_APROBADO);
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .insert({
        titulo: input.titulo,
        descripcion: input.descripcion,
        fecha_aproximada: input.fecha_aproximada,
        lugar_referencia: input.lugar_referencia,
        imagen_url: input.imagen_url,
        id_categoria_museo: input.id_categoria_museo,
        id_estado_revision: aprobadoId,
        id_usuario_revisor: usuario?.id ?? null,
        nombre_aportante: input.nombre_aportante,
        correo_aportante: input.correo_aportante,
        fec_revision: new Date().toISOString(),
      })
      .select(APORTE_COLUMNS)
      .single(),
    "Failed to save museo pieza",
  );

  return mapAporteMuseo(data);
}

export async function deletePiezaMuseoAdmin(id) {
  return deleteAporteMuseoAdmin(id);
}

export async function listPiezasMuseoPublicas() {
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(APORTE_APROBADOS_COLUMNS)
      .eq("estado_revision.nombre_estado_revision", NOMBRE_REVISION_APROBADO)
      .order("fec_creacion", { ascending: false }),
    "Failed to list public museo piezas",
  );

  return (data ?? []).map(mapAporteMuseoPublico);
}

export async function createAporteMuseo(input) {
  const pendienteId = await idEstadoRevision(NOMBRE_REVISION_PENDIENTE);
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .insert({
        ...input,
        id_estado_revision: pendienteId,
      })
      .select("id_aporte")
      .single(),
    "Failed to create museo aporte",
  );

  return { id: data.id_aporte };
}

export async function listAportesMuseoAdmin() {
  const data = assertQuery(
    await admin()
      .from("museo_aportes")
      .select(APORTE_COLUMNS)
      .order("fec_creacion", { ascending: false }),
    "Failed to list museo aportes",
  );

  return (data ?? []).map(mapAporteMuseo);
}

export async function countAportesMuseoAdmin() {
  const { count, error } = await admin()
    .from("museo_aportes")
    .select("id_aporte", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to count museo aportes: ${error.message}`);
  }

  if (!Number.isInteger(count)) {
    throw new Error("Supabase did not return an exact museo aportes count.");
  }

  return count;
}

export async function deleteAporteMuseoAdmin(id) {
  const current = await getPiezaMuseoAdmin(id);
  if (!current) return null;

  const deleted = assertQuery(
    await admin()
      .from("museo_aportes")
      .delete()
      .eq("id_aporte", id)
      .select("id_aporte")
      .maybeSingle(),
    "Failed to delete museo aporte",
  );

  if (!deleted) return null;

  await cleanupAporteImage(current.imagen_url);
  return true;
}

async function revisarAporteAdmin(id, nombreEstado, usuarioId) {
  const pendienteId = await idEstadoRevision(NOMBRE_REVISION_PENDIENTE);
  const nextId = await idEstadoRevision(nombreEstado);
  const current = await getPiezaMuseoAdmin(id);

  if (!current) return { error: "NOT_FOUND" };
  if (!mismoNombreCatalogo(current.estado_revision, NOMBRE_REVISION_PENDIENTE)) {
    return { error: "ALREADY_PROCESSED" };
  }

  const updated = assertQuery(
    await admin()
      .from("museo_aportes")
      .update({
        id_estado_revision: nextId,
        fec_revision: new Date().toISOString(),
        id_usuario_revisor: usuarioId ?? null,
      })
      .eq("id_aporte", id)
      .eq("id_estado_revision", pendienteId)
      .select(APORTE_COLUMNS)
      .maybeSingle(),
    "Failed to review museo aporte",
  );

  if (!updated) return { error: "ALREADY_PROCESSED" };

  return { aporte: mapAporteMuseo(updated) };
}

export async function aprobarAporteMuseoAdmin(id, usuarioId) {
  const result = await revisarAporteAdmin(id, NOMBRE_REVISION_APROBADO, usuarioId);
  if (result.error) return result;
  return { aprobado: true, aporte: result.aporte };
}

export async function rechazarAporteMuseoAdmin(id, usuarioId) {
  const result = await revisarAporteAdmin(id, NOMBRE_REVISION_RECHAZADO, usuarioId);
  if (result.error) return result;
  return { rechazado: true, aporte: result.aporte };
}
