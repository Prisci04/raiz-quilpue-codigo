import "server-only";

import { toExactIlikePattern } from "@/lib/auth/credentials";
import { hashPassword } from "@/lib/auth/password";
import { UsuarioError } from "@/lib/usuarios/errors.mjs";
import { ROL_CODIGOS } from "@/lib/usuarios/validation.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const USUARIO_COLUMNS =
  "id,nombre,apellido,email,telefono,estado,fecha_creacion,tipo_usuario";

const USUARIO_LIST_COLUMNS = `
  id,
  nombre,
  apellido,
  email,
  telefono,
  estado,
  fecha_creacion,
  usuario_roles (
    roles (
      codigo,
      nombre
    )
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

function mapRoles(links) {
  return (links ?? [])
    .map((link) => link?.roles)
    .filter((rol) => rol?.codigo && rol?.nombre)
    .map((rol) => ({
      codigo: rol.codigo,
      nombre: rol.nombre,
    }));
}

function mapUsuario(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido ?? null,
    email: row.email,
    telefono: row.telefono ?? null,
    estado: row.estado,
    fecha_creacion: row.fecha_creacion,
    roles: mapRoles(row.usuario_roles),
  };
}

function isActiveAdmin(usuario) {
  return (
    usuario.estado === "activo" &&
    usuario.roles.some((rol) => rol.codigo === "administrador")
  );
}

function countOtherActiveAdmins(usuarios, userId) {
  return usuarios.filter((usuario) => {
    return Number(usuario.id) !== Number(userId) && isActiveAdmin(usuario);
  }).length;
}

async function findRolActivoByCodigo(codigo) {
  const { data, error } = await client()
    .from("roles")
    .select("id,codigo,nombre,estado")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  if (!data || data.estado !== "activo") {
    return null;
  }

  return data;
}

async function emailTaken(email, excludeId) {
  const { data, error } = await client()
    .from("usuarios")
    .select("id")
    .ilike("email", toExactIlikePattern(email))
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

  return Number(data.id) !== Number(excludeId);
}

async function listInternos() {
  const { data, error } = await client()
    .from("usuarios")
    .select(USUARIO_LIST_COLUMNS)
    .eq("tipo_usuario", "interno")
    .order("nombre", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw queryFailed(error);
  }

  return (data ?? []).map(mapUsuario);
}

async function findInternoById(id) {
  const { data, error } = await client()
    .from("usuarios")
    .select(USUARIO_LIST_COLUMNS)
    .eq("id", id)
    .eq("tipo_usuario", "interno")
    .maybeSingle();

  if (error) {
    throw queryFailed(error);
  }

  return data ? mapUsuario(data) : null;
}

async function requireInterno(id) {
  const usuario = await findInternoById(id);

  if (!usuario) {
    throw new UsuarioError("NOT_FOUND", "Usuario no encontrado.");
  }

  return usuario;
}

async function replaceRol(usuarioId, rolId) {
  const { data: previous, error: readError } = await client()
    .from("usuario_roles")
    .select("rol_id")
    .eq("usuario_id", usuarioId);

  if (readError) {
    throw queryFailed(readError);
  }

  const current = previous ?? [];

  if (current.length === 1 && Number(current[0].rol_id) === Number(rolId)) {
    return;
  }

  const { error: deleteError } = await client()
    .from("usuario_roles")
    .delete()
    .eq("usuario_id", usuarioId);

  if (deleteError) {
    throw queryFailed(deleteError);
  }

  const { error: insertError } = await client().from("usuario_roles").insert({
    usuario_id: usuarioId,
    rol_id: rolId,
  });

  if (!insertError) {
    return;
  }

  if (current.length > 0) {
    await client()
      .from("usuario_roles")
      .insert(
        current.map((row) => ({
          usuario_id: usuarioId,
          rol_id: row.rol_id,
        })),
      );
  }

  throw queryFailed(insertError);
}

async function assertKeepsAnActiveAdmin(usuario, nextRolCodigo) {
  const leavesAdmin =
    isActiveAdmin(usuario) && nextRolCodigo !== "administrador";

  if (!leavesAdmin) {
    return;
  }

  const usuarios = await listInternos();

  if (countOtherActiveAdmins(usuarios, usuario.id) === 0) {
    throw new UsuarioError(
      "LAST_ADMIN",
      "Debe quedar al menos un administrador activo.",
    );
  }
}

export async function usuarioTieneRol(usuarioId, codigo) {
  const { data, error } = await client()
    .from("usuario_roles")
    .select("roles!inner(codigo)")
    .eq("usuario_id", usuarioId)
    .eq("roles.codigo", codigo)
    .limit(1);

  if (error) {
    throw queryFailed(error);
  }

  return Array.isArray(data) && data.length > 0;
}

export async function listUsuariosInternos() {
  const [usuarios, rolesResult] = await Promise.all([
    listInternos(),
    client()
      .from("roles")
      .select("codigo,nombre,estado")
      .eq("estado", "activo")
      .order("nombre", { ascending: true }),
  ]);

  if (rolesResult.error) {
    throw queryFailed(rolesResult.error);
  }

  const roles = (rolesResult.data ?? [])
    .filter((rol) => ROL_CODIGOS.includes(rol.codigo))
    .map((rol) => ({
      codigo: rol.codigo,
      nombre: rol.nombre,
    }));

  return { usuarios, roles };
}

export async function createUsuarioInterno(input) {
  const rol = await findRolActivoByCodigo(input.rolCodigo);

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
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email,
      telefono: input.telefono,
      password_hash: passwordHash,
      tipo_usuario: "interno",
      estado: "activo",
    })
    .select(USUARIO_COLUMNS)
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

  const { error: roleError } = await client().from("usuario_roles").insert({
    usuario_id: data.id,
    rol_id: rol.id,
  });

  if (roleError) {
    await client().from("usuarios").delete().eq("id", data.id);
    throw queryFailed(roleError);
  }

  return {
    id: data.id,
    nombre: data.nombre,
    apellido: data.apellido ?? null,
    email: data.email,
    telefono: data.telefono ?? null,
    estado: data.estado,
    fecha_creacion: data.fecha_creacion,
    roles: [{ codigo: rol.codigo, nombre: rol.nombre }],
  };
}

export async function updateUsuarioInterno(id, input) {
  const current = await requireInterno(id);
  const rol = await findRolActivoByCodigo(input.rolCodigo);

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

  await assertKeepsAnActiveAdmin(current, rol.codigo);

  const previousCodigo = current.roles[0]?.codigo ?? null;

  await replaceRol(id, rol.id);

  const { error } = await client()
    .from("usuarios")
    .update({
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email,
      telefono: input.telefono,
    })
    .eq("id", id)
    .eq("tipo_usuario", "interno");

  if (error) {
    if (previousCodigo) {
      const previousRol = await findRolActivoByCodigo(previousCodigo);

      if (previousRol) {
        await replaceRol(id, previousRol.id);
      }
    }

    if (error.code === UNIQUE_VIOLATION) {
      throw new UsuarioError(
        "EMAIL_TAKEN",
        "Ya existe un usuario con ese correo.",
      );
    }

    throw queryFailed(error);
  }

  return requireInterno(id);
}

export async function setEstadoUsuarioInterno(id, estado, actorId) {
  const current = await requireInterno(id);

  if (current.estado === estado) {
    return current;
  }

  if (estado === "inactivo") {
    if (Number(current.id) === Number(actorId)) {
      throw new UsuarioError(
        "SELF_ACTION",
        "No puedes desactivar tu propia cuenta.",
      );
    }

    if (isActiveAdmin(current)) {
      const usuarios = await listInternos();

      if (countOtherActiveAdmins(usuarios, current.id) === 0) {
        throw new UsuarioError(
          "LAST_ADMIN",
          "Debe quedar al menos un administrador activo.",
        );
      }
    }

    const { error } = await client()
      .from("usuarios")
      .update({ estado: "inactivo" })
      .eq("id", id)
      .eq("tipo_usuario", "interno");

    if (error) {
      throw queryFailed(error);
    }

    const { error: sessionError } = await client()
      .from("sesiones")
      .delete()
      .eq("usuario_id", id);

    if (sessionError) {
      await client()
        .from("usuarios")
        .update({ estado: "activo" })
        .eq("id", id)
        .eq("tipo_usuario", "interno");

      throw queryFailed(sessionError);
    }
  } else {
    const { error } = await client()
      .from("usuarios")
      .update({ estado: "activo" })
      .eq("id", id)
      .eq("tipo_usuario", "interno");

    if (error) {
      throw queryFailed(error);
    }
  }

  return requireInterno(id);
}

export async function deleteUsuarioInterno(id, actorId) {
  const current = await requireInterno(id);

  if (Number(current.id) === Number(actorId)) {
    throw new UsuarioError(
      "SELF_ACTION",
      "No puedes eliminar tu propia cuenta.",
    );
  }

  if (current.estado !== "inactivo") {
    throw new UsuarioError(
      "MUST_DEACTIVATE",
      "Debes desactivar el usuario antes de eliminarlo.",
    );
  }

  const { error } = await client()
    .from("usuarios")
    .delete()
    .eq("id", id)
    .eq("tipo_usuario", "interno")
    .eq("estado", "inactivo");

  if (error) {
    throw queryFailed(error);
  }

  return { id: current.id };
}
