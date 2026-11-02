const PUBLIC_USER_FIELDS = ["id", "nombre", "apellido", "email"];

export function toPublicUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
  };
}

export function publicUserKeys() {
  return PUBLIC_USER_FIELDS;
}
