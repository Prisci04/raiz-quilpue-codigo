import "server-only";

import { toExactIlikePattern } from "@/lib/auth/credentials";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const USUARIO_AUTH_COLUMNS =
  "id_user,nombre_user,apellido_user,correo_user,password";

const MULTIPLE_ROWS = "PGRST116";

function assertQuery(error) {
  if (error) {
    throw new Error("Auth query failed");
  }
}

function mapUsuario(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id_user,
    nombre: row.nombre_user,
    apellido: row.apellido_user,
    email: row.correo_user,
    password: row.password,
  };
}

export async function findUsuarioByEmail(email) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select(USUARIO_AUTH_COLUMNS)
    .ilike("correo_user", toExactIlikePattern(email))
    .maybeSingle();

  if (error?.code === MULTIPLE_ROWS) {
    return null;
  }

  assertQuery(error);
  return mapUsuario(data);
}

export async function findUsuarioById(id) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select(USUARIO_AUTH_COLUMNS)
    .eq("id_user", id)
    .maybeSingle();

  assertQuery(error);
  return mapUsuario(data);
}
