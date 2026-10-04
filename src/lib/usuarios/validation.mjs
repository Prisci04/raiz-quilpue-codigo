export const NOMBRE_MAX_LENGTH = 120;
export const APELLIDO_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
export const TELEFONO_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const ROL_CODIGOS = ["administrador", "editor"];

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

function fail(message) {
  return { ok: false, message };
}

function readOptionalText(value, maxLength, label) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return fail(`${label} no es válido.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (trimmed.length > maxLength) {
    return fail(`${label} supera el máximo de ${maxLength} caracteres.`);
  }

  return { ok: true, value: trimmed };
}

function readNombre(value) {
  if (typeof value !== "string") {
    return fail("El nombre es obligatorio.");
  }

  const nombre = value.trim();

  if (!nombre) {
    return fail("El nombre es obligatorio.");
  }

  if (nombre.length > NOMBRE_MAX_LENGTH) {
    return fail(`El nombre supera el máximo de ${NOMBRE_MAX_LENGTH} caracteres.`);
  }

  return { ok: true, value: nombre };
}

function readEmail(value) {
  if (typeof value !== "string") {
    return fail("El correo es obligatorio.");
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    return fail("El correo es obligatorio.");
  }

  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return fail("El correo no es válido.");
  }

  return { ok: true, value: email };
}

function readRolCodigo(value) {
  if (typeof value !== "string") {
    return fail("El rol es obligatorio.");
  }

  const rolCodigo = value.trim().toLowerCase();

  if (!ROL_CODIGOS.includes(rolCodigo)) {
    return fail("El rol seleccionado no es válido.");
  }

  return { ok: true, value: rolCodigo };
}

export function passwordChecks(password) {
  const value = typeof password === "string" ? password : "";

  return [
    {
      id: "length",
      label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
      met: value.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "upper",
      label: "Una mayúscula",
      met: /[A-Z]/.test(value),
    },
    {
      id: "lower",
      label: "Una minúscula",
      met: /[a-z]/.test(value),
    },
    {
      id: "digit",
      label: "Un número",
      met: /[0-9]/.test(value),
    },
    {
      id: "symbol",
      label: "Un símbolo",
      met: /[^A-Za-z0-9]/.test(value),
    },
  ];
}

export function passwordMeetsPolicy(password) {
  if (typeof password !== "string" || password.length > PASSWORD_MAX_LENGTH) {
    return false;
  }

  return passwordChecks(password).every((check) => check.met);
}

function readPassword(value) {
  if (typeof value !== "string" || !value) {
    return fail("La contraseña es obligatoria.");
  }

  if (!passwordMeetsPolicy(value)) {
    return fail(
      "La contraseña debe tener al menos 12 caracteres e incluir una mayúscula, una minúscula, un número y un símbolo.",
    );
  }

  return { ok: true, value };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseCreateUsuario(body) {
  if (!isObject(body)) {
    return fail("La solicitud no es válida.");
  }

  const nombre = readNombre(body.nombre);
  if (!nombre.ok) return nombre;

  const apellido = readOptionalText(body.apellido, APELLIDO_MAX_LENGTH, "El apellido");
  if (!apellido.ok) return apellido;

  const email = readEmail(body.email);
  if (!email.ok) return email;

  const telefono = readOptionalText(body.telefono, TELEFONO_MAX_LENGTH, "El teléfono");
  if (!telefono.ok) return telefono;

  const rolCodigo = readRolCodigo(body.rolCodigo);
  if (!rolCodigo.ok) return rolCodigo;

  const password = readPassword(body.password);
  if (!password.ok) return password;

  return {
    ok: true,
    value: {
      nombre: nombre.value,
      apellido: apellido.value,
      email: email.value,
      telefono: telefono.value,
      rolCodigo: rolCodigo.value,
      password: password.value,
    },
  };
}

export function parseUpdateUsuario(body) {
  if (!isObject(body)) {
    return fail("La solicitud no es válida.");
  }

  const nombre = readNombre(body.nombre);
  if (!nombre.ok) return nombre;

  const apellido = readOptionalText(body.apellido, APELLIDO_MAX_LENGTH, "El apellido");
  if (!apellido.ok) return apellido;

  const email = readEmail(body.email);
  if (!email.ok) return email;

  const telefono = readOptionalText(body.telefono, TELEFONO_MAX_LENGTH, "El teléfono");
  if (!telefono.ok) return telefono;

  const rolCodigo = readRolCodigo(body.rolCodigo);
  if (!rolCodigo.ok) return rolCodigo;

  return {
    ok: true,
    value: {
      nombre: nombre.value,
      apellido: apellido.value,
      email: email.value,
      telefono: telefono.value,
      rolCodigo: rolCodigo.value,
    },
  };
}

export function parsePerfilUpdate(body) {
  if (!isObject(body)) {
    return fail("La solicitud no es válida.");
  }

  const nombre = readNombre(body.nombre);
  if (!nombre.ok) return nombre;

  const apellido = readOptionalText(body.apellido, APELLIDO_MAX_LENGTH, "El apellido");
  if (!apellido.ok) return apellido;

  const telefono = readOptionalText(body.telefono, TELEFONO_MAX_LENGTH, "El teléfono");
  if (!telefono.ok) return telefono;

  return {
    ok: true,
    value: {
      nombre: nombre.value,
      apellido: apellido.value,
      telefono: telefono.value,
    },
  };
}

export function parsePasswordChange(body) {
  if (!isObject(body)) {
    return fail("La solicitud no es válida.");
  }

  if (typeof body.passwordActual !== "string" || !body.passwordActual) {
    return fail("La contraseña actual es obligatoria.");
  }

  if (body.passwordActual.length > PASSWORD_MAX_LENGTH) {
    return fail("La contraseña actual no es válida.");
  }

  const passwordNueva = readPassword(body.passwordNueva);
  if (!passwordNueva.ok) return passwordNueva;

  if (body.passwordNueva !== body.passwordConfirmacion) {
    return fail("Las nuevas contraseñas no coinciden.");
  }

  return {
    ok: true,
    value: {
      passwordActual: body.passwordActual,
      passwordNueva: passwordNueva.value,
    },
  };
}

export function parseEstadoUsuario(body) {
  if (!isObject(body) || typeof body.estado !== "string") {
    return fail("La solicitud no es válida.");
  }

  const estado = body.estado.trim().toLowerCase();

  if (estado !== "activo" && estado !== "inactivo") {
    return fail("El estado no es válido.");
  }

  return { ok: true, value: estado };
}
