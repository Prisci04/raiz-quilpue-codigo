import "server-only";

import { toExactIlikePattern } from "@/lib/auth/credentials";
import { hashPassword } from "@/lib/auth/password";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";
import {
  ROL_CODIGOS,
  rolCodigoFromNombre,
  rolNombreFromCodigo,
} from "@/lib/usuarios/validation.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const USUARIO_LIST_COLUMNS = `
  id_user,
  nombre_user,
  apellido_user,
  correo_user,
  telefono,
  fec_creacion,
  id_rol,
  roles (
    id_rol,
    nombre_rol
  )
`;

const UNIQUE_VIOLATION = "23505";
const MULTIPLE_ROWS = "PGRST116";

function client() {
  return getSupabaseAdminClient();
}

function queryFailed(error) {
  const failure = new Error("Usuario query failed");
  failure.code = error?.code ?? "QUERY_FAILED";
  return failure;
}

function mapRol(roles) {
  const row = Array.isArray(roles) ? roles[0] : roles;
  const codigo = rolCodigoFromNombre(row?.nombre_rol);

  if (!codigo) {
    return [];
  }

  return [{ codigo, nombre: row.nombre_rol }];
}

function mapUsuario(row) {
  return {
    id: row.id_user,
    nombre: row.nombre_user,
    apellido: row.apellido_user ?? null,
    email: row.correo_user,
    telefono: row.telefono ?? null,
    fecha_creacion: row.fec_creacion,
    roles: mapRol(row.roles),
  };
}

function isAdmin(usuario) {
  return usuario.roles.some((rol) => rol.codigo === "administrador");
}

function countOtherAdmins(usuarios, userId) {
  return usuarios.filter((usuario) => {
    return Number(usuario.id) !== Number(userId) && isAdmin(usuario);
  }).length;
}

async function findRolByCodigo(codigo) {
  const nombreRol = rolNombreFromCodigo(codigo);

  if (!nombreRol) {
    return null;
  }

  const { data, error } = await client()
    .from("roles")
    .select("id_rol,nombre_rol")
    .eq("nombre_rol", nombreRol)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id_rol,
    codigo: rolCodigoFromNombre(data.nombre_rol),
    nombre: data.nombre_rol,
  };
}

async function emailTaken(email, excludeId) {
  const { data, error } = await client()
    .from("usuarios")
    .select("id_user")
    .ilike("correo_user", toExactIlikePattern(email))
    .maybeSingle();

  if (error?.code === MULTIPLE_ROWS) {
    return true;
  }

  if (error) {
    throw queryFailed(error);
  }

  if (!data) {
    return false;
  }

  return Number(data.id_user) !== Number(excludeId);
}

async function listUsuarios() {
  const { data, error } = await client()
    .from("usuarios")
    .select(USUARIO_LIST_COLUMNS)
    .order("nombre_user", { ascending: true })
    .order("id_user", { ascending: true });

  if (error) {
    throw queryFailed(error);
  }

  return (data ?? []).map(mapUsuario);
}

async function findUsuarioById(id) {
  const { data, error } = await client()
    .from("usuarios")
    .select(USUARIO_LIST_COLUMNS)
    .eq("id_user", id)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  return data ? mapUsuario(data) : null;
}

async function requireUsuario(id) {
  const usuario = await findUsuarioById(id);

  if (!usuario) {
    throw new UsuarioError("NOT_FOUND", "Usuario no encontrado.");
  }

  return usuario;
}

async function assertKeepsAnAdmin(usuario, nextRolCodigo) {
  const leavesAdmin = isAdmin(usuario) && nextRolCodigo !== "administrador";

  if (!leavesAdmin) {
    return;
  }

  const usuarios = await listUsuarios();

  if (countOtherAdmins(usuarios, usuario.id) === 0) {
    throw new UsuarioError(
      "LAST_ADMIN",
      "Debe quedar al menos un administrador.",
    );
  }
}

export async function usuarioTieneRol(usuarioId, codigo) {
  const nombreRol = rolNombreFromCodigo(codigo);

  if (!nombreRol) {
    return false;
  }

  const { data, error } = await client()
    .from("usuarios")
    .select("id_user, roles!inner(nombre_rol)")
    .eq("id_user", usuarioId)
    .eq("roles.nombre_rol", nombreRol)
    .limit(1);

  if (error) {
    throw queryFailed(error);
  }

  return Array.isArray(data) && data.length > 0;
}

export async function usuarioEsGestorContenido(usuarioId) {
  const [isAdministrador, isEditor] = await Promise.all([
    usuarioTieneRol(usuarioId, "administrador"),
    usuarioTieneRol(usuarioId, "editor"),
  ]);

  return isAdministrador || isEditor;
}

export async function listUsuariosInternos() {
  const [usuarios, rolesResult] = await Promise.all([
    listUsuarios(),
    client()
      .from("roles")
      .select("id_rol,nombre_rol")
      .order("nombre_rol", { ascending: true }),
  ]);

  if (rolesResult.error) {
    throw queryFailed(rolesResult.error);
  }

  const roles = (rolesResult.data ?? [])
    .map((rol) => ({
      codigo: rolCodigoFromNombre(rol.nombre_rol),
      nombre: rol.nombre_rol,
    }))
    .filter((rol) => ROL_CODIGOS.includes(rol.codigo));

  return { usuarios, roles };
}

export async function createUsuarioInterno(input) {
  const rol = await findRolByCodigo(input.rolCodigo);

  if (!rol) {
    throw new UsuarioError(
      "ROLE_NOT_FOUND",
      "El rol seleccionado no está disponible.",
    );
  }

  if (await emailTaken(input.email)) {
    throw new UsuarioError(
      "EMAIL_TAKEN",
      "Ya existe un usuario con ese correo.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const { data, error } = await client()
    .from("usuarios")
    .insert({
      nombre_user: input.nombre,
      apellido_user: input.apellido,
      correo_user: input.email,
      telefono: input.telefono,
      password: passwordHash,
      id_rol: rol.id,
    })
    .select(
      "id_user,nombre_user,apellido_user,correo_user,telefono,fec_creacion",
    )
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    throw new UsuarioError(
      "EMAIL_TAKEN",
      "Ya existe un usuario con ese correo.",
    );
  }

  if (error) {
    throw queryFailed(error);
  }

  return {
    id: data.id_user,
    nombre: data.nombre_user,
    apellido: data.apellido_user ?? null,
    email: data.correo_user,
    telefono: data.telefono ?? null,
    fecha_creacion: data.fec_creacion,
    roles: [{ codigo: rol.codigo, nombre: rol.nombre }],
  };
}

export async function updateUsuarioInterno(id, input) {
  const current = await requireUsuario(id);
  const rol = await findRolByCodigo(input.rolCodigo);

  if (!rol) {
    throw new UsuarioError(
      "ROLE_NOT_FOUND",
      "El rol seleccionado no está disponible.",
    );
  }

  if (await emailTaken(input.email, id)) {
    throw new UsuarioError(
      "EMAIL_TAKEN",
      "Ya existe un usuario con ese correo.",
    );
  }

  await assertKeepsAnAdmin(current, rol.codigo);

  const { error } = await client()
    .from("usuarios")
    .update({
      nombre_user: input.nombre,
      apellido_user: input.apellido,
      correo_user: input.email,
      telefono: input.telefono,
      id_rol: rol.id,
    })
    .eq("id_user", id);

  if (error?.code === UNIQUE_VIOLATION) {
    throw new UsuarioError(
      "EMAIL_TAKEN",
      "Ya existe un usuario con ese correo.",
    );
  }

  if (error) {
    throw queryFailed(error);
  }

  return requireUsuario(id);
}

export async function deleteUsuarioInterno(id, actorId) {
  const current = await requireUsuario(id);

  if (Number(current.id) === Number(actorId)) {
    throw new UsuarioError(
      "SELF_ACTION",
      "No puedes eliminar tu propia cuenta.",
    );
  }

  if (isAdmin(current)) {
    const usuarios = await listUsuarios();

    if (countOtherAdmins(usuarios, current.id) === 0) {
      throw new UsuarioError(
        "LAST_ADMIN",
        "Debe quedar al menos un administrador.",
      );
    }
  }

  const { error } = await client().from("usuarios").delete().eq("id_user", id);

  if (error) {
    throw queryFailed(error);
  }

  return { id: current.id };
}
