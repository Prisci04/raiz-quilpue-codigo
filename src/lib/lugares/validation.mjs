function fail(message) {
  return { ok: false, message };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredText(value, maxLength, emptyMessage, longMessage) {
  if (typeof value !== "string") {
    return fail(emptyMessage);
  }

  const text = value.trim();

  if (!text) {
    return fail(emptyMessage);
  }

  if (text.length > maxLength) {
    return fail(longMessage);
  }

  return { ok: true, value: text };
}

function readOptionalText(value, maxLength, label) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return fail(`${label} no es válido.`);
  }

  const text = value.trim();

  if (!text) {
    return { ok: true, value: null };
  }

  if (text.length > maxLength) {
    return fail(`${label} supera el máximo de ${maxLength} caracteres.`);
  }

  return { ok: true, value: text };
}

function readId(value, label) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    return fail(`${label} no es válido.`);
  }

  return { ok: true, value: id };
}

function readOptionalCoordinate(value, min, max, label) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    return fail(`${label} no es válido.`);
  }

  return { ok: true, value: number };
}

export function parseLugarInput(body) {
  if (!isObject(body)) {
    return fail("La solicitud no es válida.");
  }

  const nombre = readRequiredText(
    body.nombre_lugar ?? body.nombre,
    150,
    "El nombre del lugar es obligatorio.",
    "El nombre del lugar supera el máximo de 150 caracteres.",
  );
  if (!nombre.ok) return nombre;

  const direccion = readRequiredText(
    body.direccion,
    250,
    "La dirección es obligatoria.",
    "La dirección supera el máximo de 250 caracteres.",
  );
  if (!direccion.ok) return direccion;

  const comuna = readId(body.id_comuna, "La comuna");
  if (!comuna.ok) return comuna;

  const placeId = readOptionalText(body.google_place_id, 255, "El identificador de Google");
  if (!placeId.ok) return placeId;

  const latitud = readOptionalCoordinate(body.latitud, -90, 90, "La latitud");
  if (!latitud.ok) return latitud;

  const longitud = readOptionalCoordinate(body.longitud, -180, 180, "La longitud");
  if (!longitud.ok) return longitud;

  return {
    ok: true,
    value: {
      nombre_lugar: nombre.value,
      direccion: direccion.value,
      id_comuna: comuna.value,
      google_place_id: placeId.value,
      latitud: latitud.value,
      longitud: longitud.value,
    },
  };
}
