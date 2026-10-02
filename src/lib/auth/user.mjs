const PUBLIC_USER_FIELDS = ["id", "nombre", "apellido", "email", "tipoUsuario"];

export function toPublicUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    tipoUsuario: user.tipo_usuario,
  };
}

export function publicUserKeys() {
  return PUBLIC_USER_FIELDS;
}
