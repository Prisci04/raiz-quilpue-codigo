import "server-only";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { deleteOtrasSesiones } from "@/services/auth.service";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PERFIL_COLUMNS = `
  id,
  nombre,
  apellido,
  email,
  telefono,
  estado,
  usuario_roles (
    roles (
      codigo,
      nombre
    )
  )
`;

function queryFailed(error) {
  const failure = new Error("Perfil query failed");
  failure.code = error?.code ?? "QUERY_FAILED";
  return failure;
}

function mapPerfil(row) {
  const rol = (row.usuario_roles ?? [])
    .map((link) => link?.roles)
    .find((item) => item?.codigo && item?.nombre);

  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido ?? null,
    email: row.email,
    telefono: row.telefono ?? null,
    estado: row.estado,
    rol: rol ? { codigo: rol.codigo, nombre: rol.nombre } : null,
  };
}

export async function getPerfilActual(usuarioId) {
  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select(PERFIL_COLUMNS)
    .eq("id", usuarioId)
    .eq("tipo_usuario", "interno")
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
      nombre: input.nombre,
      apellido: input.apellido,
      telefono: input.telefono,
    })
    .eq("id", usuarioId)
    .eq("tipo_usuario", "interno");

  if (error) {
    throw queryFailed(error);
  }

  return getPerfilActual(usuarioId);
}

export async function changePasswordActual(usuarioId, input, tokenHashActual) {
  if (!tokenHashActual) {
    throw queryFailed({ code: "SESSION_UNKNOWN" });
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("usuarios")
    .select("id,password_hash")
    .eq("id", usuarioId)
    .eq("tipo_usuario", "interno")
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  if (!data) {
    throw new UsuarioError("NOT_FOUND", "Usuario no encontrado.");
  }

  const passwordOk = await verifyPassword(input.passwordActual, data.password_hash);

  if (!passwordOk) {
    throw new UsuarioError(
      "PASSWORD_ACTUAL",
      "La contraseña actual es incorrecta.",
    );
  }

  const passwordHash = await hashPassword(input.passwordNueva);

  const { error: updateError } = await getSupabaseAdminClient()
    .from("usuarios")
    .update({ password_hash: passwordHash })
    .eq("id", usuarioId)
    .eq("tipo_usuario", "interno");

  if (updateError) {
    throw queryFailed(updateError);
  }

  await deleteOtrasSesiones(usuarioId, tokenHashActual);

  return { ok: true };
}

export async function closeOtrasSesiones(usuarioId, tokenHashActual) {
  if (!tokenHashActual) {
    throw queryFailed({ code: "SESSION_UNKNOWN" });
  }

  await deleteOtrasSesiones(usuarioId, tokenHashActual);
  return { ok: true };
}
