import "server-only";

import { ContenidoError } from "@/lib/contenidos/errors.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteOwnedPortada } from "@/services/storage.service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const COLUMNS = "id,titulo,descripcion,tipo,estado,imagen_url,fecha_publicacion";
const DETAIL_COLUMNS =
  "id,titulo,descripcion,resumen,contenido,tipo,imagen_url,fecha_publicacion,estado";
const PERMISSION_DENIED = "42501";
const MONTHS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

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
  const when = formatWhen(row.fecha_publicacion);

  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion ?? "",
    tipo: row.tipo,
    estado: row.estado,
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fecha_publicacion ?? null,
    fecha_texto: when.fecha_texto,
    hora_texto: when.hora_texto,
  };
}

function ordered(query) {
  return query
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
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

  const when = formatWhen(row.fecha_publicacion);

  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion ?? "",
    resumen: row.resumen ?? "",
    contenido: row.contenido,
    tipo: row.tipo,
    imagen_url: row.imagen_url ?? null,
    fecha_publicacion: row.fecha_publicacion ?? null,
    estado: row.estado,
    fecha_texto: when.fecha_texto,
    hora_texto: when.hora_texto,
  };
}

async function findContenidoRow(id) {
  const { data, error } = await adminClient()
    .from("contenidos")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  return data;
}

function fechaAlPublicar(estado, fechaActual) {
  if (estado === "publicada" && !fechaActual) {
    return new Date().toISOString();
  }

  return fechaActual ?? null;
}

export async function obtenerContenidoAdmin(id) {
  const row = await findContenidoRow(id);
  return mapContenidoDetalle(row);
}

export async function crearContenido(input) {
  const row = {
    titulo: input.titulo,
    descripcion: input.descripcion,
    resumen: input.resumen,
    contenido: input.contenido,
    tipo: input.tipo,
    imagen_url: input.imagen_url ?? null,
    estado: input.estado,
    fecha_publicacion: input.estado === "publicada" ? new Date().toISOString() : null,
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

export async function actualizarContenido(id, input) {
  const current = await findContenidoRow(id);

  if (!current) {
    throw new ContenidoError("NOT_FOUND", "Contenido no encontrado.");
  }

  const patch = {
    titulo: input.titulo,
    descripcion: input.descripcion,
    resumen: input.resumen,
    contenido: input.contenido,
    tipo: input.tipo,
    estado: input.estado,
    fecha_publicacion: fechaAlPublicar(input.estado, current.fecha_publicacion),
  };

  if (input.imagen_url !== undefined) {
    patch.imagen_url = input.imagen_url;
  }

  const { data, error } = await adminClient()
    .from("contenidos")
    .update(patch)
    .eq("id", id)
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

export async function cambiarEstadoContenido(id, estado) {
  const current = await findContenidoRow(id);

  if (!current) {
    throw new ContenidoError("NOT_FOUND", "Contenido no encontrado.");
  }

  const { data, error } = await adminClient()
    .from("contenidos")
    .update({
      estado,
      fecha_publicacion: fechaAlPublicar(estado, current.fecha_publicacion),
    })
    .eq("id", id)
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

  const { error } = await adminClient().from("contenidos").delete().eq("id", id);

  if (error) {
    throw queryFailed(error);
  }

  await deleteOwnedPortada(current.imagen_url);

  return true;
}
