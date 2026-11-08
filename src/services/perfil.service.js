import "server-only";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";
import { rolCodigoFromNombre } from "@/lib/usuarios/validation.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PERFIL_COLUMNS = `
  id_user,
  nombre_user,
  apellido_user,
  correo_user,
  telefono,
  roles (
    nombre_rol
  )
`;

function queryFailed(error) {
  const failure = new Error("Perfil query failed");
  failure.code = error?.code ?? "QUERY_FAILED";
  return failure;
}

function mapPerfil(row) {
  const rolRow = Array.isArray(row.roles) ? row.roles[0] : row.roles;
  const codigo = rolCodigoFromNombre(rolRow?.nombre_rol);

  return {
    id: row.id_user,
    nombre: row.nombre_user,
    apellido: row.apellido_user ?? null,
    email: row.correo_user,
    telefono: row.telefono ?? null,
    rol: codigo ? { codigo, nombre: rolRow.nombre_rol } : null,
  };
}

export async function getPerfilActual(usuarioId) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select(PERFIL_COLUMNS)
    .eq("id_user", usuarioId)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  if (!data) {
    throw new UsuarioError("NOT_FOUND", "Usuario no encontrado.");
  }

  return mapPerfil(data);
}

export async function updatePerfilActual(usuarioId, input) {
  const { error } = await getSupabaseAdminClient()
    .from("usuarios")
    .update({
      nombre_user: input.nombre,
      apellido_user: input.apellido,
      telefono: input.telefono,
    })
    .eq("id_user", usuarioId);

  if (error) {
    throw queryFailed(error);
  }

  return getPerfilActual(usuarioId);
}

export async function changePasswordActual(usuarioId, input) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select("id_user,password")
    .eq("id_user", usuarioId)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  if (!data) {
    throw new UsuarioError("NOT_FOUND", "Usuario no encontrado.");
  }

  const passwordOk = await verifyPassword(input.passwordActual, data.password);

  if (!passwordOk) {
    throw new UsuarioError(
      "PASSWORD_ACTUAL",
      "La contraseña actual es incorrecta.",
    );
  }

  const passwordHash = await hashPassword(input.passwordNueva);

  const { error: updateError } = await getSupabaseAdminClient()
    .from("usuarios")
    .update({ password: passwordHash })
    .eq("id_user", usuarioId);

  if (updateError) {
    throw queryFailed(updateError);
  }

  return { ok: true, passwordHash };
}
