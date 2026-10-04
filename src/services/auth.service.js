import "server-only";

import { toExactIlikePattern } from "@/lib/auth/credentials";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const USUARIO_AUTH_COLUMNS =
  "id,nombre,apellido,email,password_hash,tipo_usuario,estado";
const USUARIO_SESSION_COLUMNS =
  "id,nombre,apellido,email,tipo_usuario,estado";
const SESION_COLUMNS =
  "id,usuario_id,fecha_creacion,ultima_actividad,fecha_expiracion";

const MULTIPLE_ROWS = "PGRST116";

function assertQuery(error) {
  if (error) {
    throw new Error("Auth query failed");
  }
}

export async function findUsuarioByEmail(email) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select(USUARIO_AUTH_COLUMNS)
    .ilike("email", toExactIlikePattern(email))
    .maybeSingle();

  if (error?.code === MULTIPLE_ROWS) {
    return null;
  }

  assertQuery(error);
  return data;
}

export async function findUsuarioById(id) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select(USUARIO_SESSION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  assertQuery(error);
  return data;
}

export async function insertSesion(row) {
  const { error } = await getSupabaseAdminClient().from("sesiones").insert({
    usuario_id: row.usuario_id,
    token_hash: row.token_hash,
    fecha_creacion: row.fecha_creacion,
    ultima_actividad: row.ultima_actividad,
    fecha_expiracion: row.fecha_expiracion,
  });

  assertQuery(error);
}

export async function findSesionByTokenHash(tokenHash) {
  const { data, error } = await getSupabaseAdminClient()
    .from("sesiones")
    .select(SESION_COLUMNS)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  assertQuery(error);
  return data;
}

export async function deleteOtrasSesiones(usuarioId, tokenHashActual) {
  const { error } = await getSupabaseAdminClient()
    .from("sesiones")
    .delete()
    .eq("usuario_id", usuarioId)
    .neq("token_hash", tokenHashActual);

  assertQuery(error);
}

export async function deleteSesionByTokenHash(tokenHash) {
  const { error } = await getSupabaseAdminClient()
    .from("sesiones")
    .delete()
    .eq("token_hash", tokenHash);

  assertQuery(error);
}

export async function touchSesion(id, ultimaActividad) {
  const { error } = await getSupabaseAdminClient()
    .from("sesiones")
    .update({ ultima_actividad: ultimaActividad })
    .eq("id", id);

  assertQuery(error);
}
