import "server-only";

import { findCatalogoById, mismoNombreCatalogo, NOMBRE_ESTADO_PUBLICADA } from "@/lib/catalogos.mjs";
import { ContenidoError } from "@/lib/contenidos/errors.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteOwnedPortada } from "@/services/storage.service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const COLUMNS = `
  id_contenido,
  titulo,
  descripcion,
  imagen_url,
  fec_publicacion,
  id_tipo_contenido,
  id_estado,
  tipo_contenido ( nombre_tipo_contenido ),
  estado_publicacion ( nombre_estado )
`;
const DETAIL_COLUMNS = `
  id_contenido,
  titulo,
  descripcion,
  resumen,
  contenido,
  imagen_url,
  fec_publicacion,
  id_tipo_contenido,
  id_estado,
  id_usuario_creador,
  tipo_contenido ( nombre_tipo_contenido ),
  estado_publicacion ( nombre_estado )
`;
const PERMISSION_DENIED = "42501";
const MONTHS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

function nested(value) {
  return Array.isArray(value) ? value[0] : value;
}

function formatWhen(value) {
  if (!value) {
    return { fecha_texto: "Sin fecha", hora_texto: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { fecha_texto: "Sin fecha", hora_texto: "" };
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const monthIndex = Number(read("month")) - 1;

  return {
    fecha_texto: `${Number(read("day"))} ${MONTHS[monthIndex] ?? ""} ${read("year")}`.trim(),
    hora_texto: `${read("hour")}:${read("minute")}`,
  };
}

function mapContenidoPanel(row) {
  const when = formatWhen(row.fec_publicacion);

  return {
    id: row.id_contenido,
    titulo: row.titulo,
    descripcion: row.descripcion ?? "",
    tipo: nested(row.tipo_contenido)?.nombre_tipo_contenido ?? "",
    estado: nested(row.estado_publicacion)?.nombre_estado ?? "",
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fec_publicacion ?? null,
    fecha_texto: when.fecha_texto,
    hora_texto: when.hora_texto,
    id_tipo_contenido: row.id_tipo_contenido,
    id_estado: row.id_estado,
  };
}

function ordered(query) {
  return query
    .order("fec_publicacion", { ascending: false, nullsFirst: false })
    .order("id_contenido", { ascending: false });
}

export async function listContenidosPanel() {
  const adminResult = await ordered(
    getSupabaseAdminClient().from("contenidos").select(COLUMNS),
  );

  if (!adminResult.error) {
    return (adminResult.data ?? []).map(mapContenidoPanel);
  }

  if (adminResult.error.code !== PERMISSION_DENIED) {
    throw new Error("Failed to list contenidos");
  }

  const publicResult = await ordered(
    getSupabaseServerClient().from("contenidos").select(COLUMNS),
  );

  if (publicResult.error) {
    throw new Error("Failed to list contenidos");
  }

  return (publicResult.data ?? []).map(mapContenidoPanel);
}

function adminClient() {
  return getSupabaseAdminClient();
}

function queryFailed(error) {
  const failure = new Error("Contenido query failed");
  failure.code = error?.code ?? "QUERY_FAILED";
  return failure;
}

function mapContenidoDetalle(row) {
  if (!row) return null;

  const when = formatWhen(row.fec_publicacion);

  return {
    id: row.id_contenido,
    titulo: row.titulo,
    descripcion: row.descripcion ?? "",
    resumen: row.resumen ?? "",
    contenido: row.contenido,
    tipo: nested(row.tipo_contenido)?.nombre_tipo_contenido ?? "",
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fec_publicacion ?? null,
    estado: nested(row.estado_publicacion)?.nombre_estado ?? "",
    fecha_texto: when.fecha_texto,
    hora_texto: when.hora_texto,
    id_tipo_contenido: row.id_tipo_contenido,
    id_estado: row.id_estado,
  };
}

async function findContenidoRow(id) {
  const { data, error } = await adminClient()
    .from("contenidos")
    .select(DETAIL_COLUMNS)
    .eq("id_contenido", id)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  return data;
}

function esPublicadaId(idEstado, catalogos) {
  const item = findCatalogoById(catalogos?.estado_publicacion, idEstado);
  return mismoNombreCatalogo(item?.nombre, NOMBRE_ESTADO_PUBLICADA);
}

function fechaAlPublicar(idEstado, fechaActual, catalogos) {
  if (esPublicadaId(idEstado, catalogos) && !fechaActual) {
    return new Date().toISOString();
  }

  return fechaActual ?? null;
}

function nowIso() {
  return new Date().toISOString();
}

export async function obtenerContenidoAdmin(id) {
  const row = await findContenidoRow(id);
  return mapContenidoDetalle(row);
}

export async function crearContenido(input, usuarioId, catalogos) {
  const row = {
    titulo: input.titulo,
    descripcion: input.descripcion,
    resumen: input.resumen,
    contenido: input.contenido,
    imagen_url: input.imagen_url ?? null,
    id_tipo_contenido: input.id_tipo_contenido,
    id_estado: input.id_estado,
    id_usuario_creador: usuarioId,
    fec_publicacion: fechaAlPublicar(input.id_estado, null, catalogos),
    fec_actualizacion: nowIso(),
  };

  const { data, error } = await adminClient()
    .from("contenidos")
    .insert(row)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) {
    throw queryFailed(error);
  }

  return mapContenidoDetalle(data);
}

export async function actualizarContenido(id, input, catalogos) {
  const current = await findContenidoRow(id);

  if (!current) {
    throw new ContenidoError("NOT_FOUND", "Contenido no encontrado.");
  }

  const patch = {
    titulo: input.titulo,
    descripcion: input.descripcion,
    resumen: input.resumen,
    contenido: input.contenido,
    id_tipo_contenido: input.id_tipo_contenido,
    id_estado: input.id_estado,
    fec_publicacion: fechaAlPublicar(input.id_estado, current.fec_publicacion, catalogos),
    fec_actualizacion: nowIso(),
  };

  if (input.imagen_url !== undefined) {
    patch.imagen_url = input.imagen_url;
  }

  const { data, error } = await adminClient()
    .from("contenidos")
    .update(patch)
    .eq("id_contenido", id)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) {
    throw queryFailed(error);
  }

  if (input.imagen_url !== undefined && current.imagen_url !== input.imagen_url) {
    await deleteOwnedPortada(current.imagen_url);
  }

  return mapContenidoDetalle(data);
}

export async function cambiarEstadoContenido(id, idEstado, catalogos) {
  const current = await findContenidoRow(id);

  if (!current) {
    throw new ContenidoError("NOT_FOUND", "Contenido no encontrado.");
  }

  const { data, error } = await adminClient()
    .from("contenidos")
    .update({
      id_estado: idEstado,
      fec_publicacion: fechaAlPublicar(idEstado, current.fec_publicacion, catalogos),
      fec_actualizacion: nowIso(),
    })
    .eq("id_contenido", id)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) {
    throw queryFailed(error);
  }

  return mapContenidoDetalle(data);
}

export async function eliminarContenido(id) {
  const current = await findContenidoRow(id);

  if (!current) {
    throw new ContenidoError("NOT_FOUND", "Contenido no encontrado.");
  }

  const { error } = await adminClient().from("contenidos").delete().eq("id_contenido", id);

  if (error) {
    throw queryFailed(error);
  }

  await deleteOwnedPortada(current.imagen_url);

  return true;
}
