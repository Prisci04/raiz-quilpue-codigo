import { parseOptionalDocumento } from "./contenidos/documento.mjs";
import {
  findCatalogoByNombre,
  parseCatalogoId,
  parseOptionalCatalogoId,
} from "./catalogos.mjs";
import {
  NOMBRE_COSTO_PAGADA,
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_PARTICIPACION_INSCRIPCION,
} from "./catalogos.mjs";
import { parseActividadUbicacion } from "./actividad-ubicacion.mjs";
import { parseOwnedAporteImageUrl, parseOwnedPortadaUrl } from "./media/policy.mjs";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const CHILE_MOBILE = /^9\d{8}$/;

function fail(message) {
  return { ok: false, message };
}

function text(value, maxLength, { required = false } = {}) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) return null;
  return result || null;
}

function nonNegativeInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function parseMontoSoloDigitos(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

function validDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeTime(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function allowedActividadImageUrl(value) {
  if (!value) return true;
  const owned = parseOwnedPortadaUrl(value);
  return Boolean(owned?.contexto === "actividades");
}

function allowedMuseoImageUrl(value) {
  if (!value) return false;
  const owned = parseOwnedPortadaUrl(value);
  if (owned?.contexto === "museo") return true;
  return Boolean(parseOwnedAporteImageUrl(value));
}

function parseInformacionAdicional(value) {
  const parsed = parseOptionalDocumento(value);
  if (!parsed.ok) {
    return fail("La información adicional no es válida.");
  }
  return parsed;
}

export function parseActividadInput(input, catalogos = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  const titulo = text(input.titulo, 180, { required: true });
  if (!titulo) return fail("El nombre de la actividad es obligatorio.");

  const descripcion = text(input.descripcion, 10000);
  const modalidad = parseCatalogoId(input.id_modalidad, catalogos.modalidad, "La modalidad");
  if (!modalidad.ok) return modalidad;

  const publico = parseCatalogoId(input.id_publico, catalogos.publico_objetivo, "El público objetivo");
  if (!publico.ok) return publico;

  const comuna = parseCatalogoId(input.id_comuna, catalogos.comuna, "La comuna");
  if (!comuna.ok) return fail("Indica la comuna de la actividad.");

  const direccion = text(input.lugar_direccion ?? input.direccion, 250, { required: true });
  if (!direccion) return fail("Indica la dirección de la actividad.");

  const nombreLugar =
    text(input.lugar_nombre ?? input.nombre_lugar, 150) || direccion.slice(0, 150);
  const googlePlaceId = text(input.google_place_id, 255);

  const participacion = parseOptionalCatalogoId(
    input.id_tipo_participacion,
    catalogos.tipo_participacion,
    "El tipo de participación",
  );
  if (!participacion.ok) return participacion;

  const costo = parseOptionalCatalogoId(input.id_costo, catalogos.costo_actividad, "El valor");
  if (!costo.ok) return costo;

  const estado = parseCatalogoId(input.id_estado, catalogos.estado_publicacion, "El estado");
  if (!estado.ok) return estado;

  const cupos = nonNegativeInteger(input.cupos_max ?? input.cupos);
  if (cupos === undefined) return fail("Los cupos deben ser un número entero mayor o igual a 0.");
  if (cupos === 0) return fail("Los cupos máximos deben ser mayores a 0.");

  const cuposEspera = nonNegativeInteger(input.cupos_espera ?? 0);
  if (cuposEspera === undefined) {
    return fail("Los cupos de lista de espera deben ser un número entero mayor o igual a 0.");
  }

  const valorMonto = parseMontoSoloDigitos(input.valor_monto);
  if (valorMonto === undefined) return fail("El monto solo puede contener números.");

  const costoItem = findCatalogoByNombre(catalogos.costo_actividad ?? [], NOMBRE_COSTO_PAGADA);
  if (costoItem && costo.value === costoItem.id && valorMonto === null) {
    return fail("Indica el monto cuando la actividad es pagada.");
  }

  const fecha = text(input.fecha, 10);
  if (!fecha || !validDate(fecha)) return fail("La fecha no es válida.");

  const horaInicio = normalizeTime(input.hora_inicio);
  const horaFin = normalizeTime(input.hora_fin);
  if (horaInicio === undefined) return fail("La hora de inicio no es válida.");
  if (horaFin === undefined) return fail("La hora de término no es válida.");
  if (horaInicio && horaFin && horaFin <= horaInicio) {
    return fail("La hora de término debe ser posterior a la de inicio.");
  }

  const imagenRaw = input.imagen_url === null || input.imagen_url === undefined ? "" : input.imagen_url;
  const imagenUrl = typeof imagenRaw === "string" ? text(imagenRaw, 2000) : null;
  if (imagenRaw && (!imagenUrl || !allowedActividadImageUrl(imagenUrl))) {
    return fail("La imagen de la actividad debe subirse desde el administrador.");
  }

  const informacion = parseInformacionAdicional(input.informacion_adicional);
  if (!informacion.ok) return informacion;

  const publicada = findCatalogoByNombre(catalogos.estado_publicacion ?? [], NOMBRE_ESTADO_PUBLICADA);
  const inscripcion = findCatalogoByNombre(
    catalogos.tipo_participacion ?? [],
    NOMBRE_PARTICIPACION_INSCRIPCION,
  );

  if (publicada && estado.value === publicada.id) {
    if (!descripcion) return fail("La descripción es obligatoria.");
    if (inscripcion && participacion.value === inscripcion.id && !Number.isInteger(cupos)) {
      return fail("Indica los cupos máximos cuando la actividad requiere inscripción.");
    }
  }
  const ubicacion = parseActividadUbicacion(input);
  if (!ubicacion.ok) return ubicacion;

  return {
    ok: true,
    value: {
      titulo,
      descripcion,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      lugar: {
        nombre_lugar: nombreLugar,
        direccion,
        id_comuna: comuna.value,
        google_place_id: googlePlaceId,
      },
      id_publico: publico.value,
      id_modalidad: modalidad.value,
      id_tipo_participacion: participacion.value,
      cupos_max: cupos,
      cupos_espera: cuposEspera ?? 0,
      id_costo: costo.value,
      valor_monto: costoItem && costo.value === costoItem.id ? valorMonto : null,
      ...ubicacion.value,
      informacion_adicional: informacion.value,
      imagen_url: imagenUrl,
      id_estado: estado.value,
    },
  };
}

export function parseActividadEstado(input, estados = []) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  if (input.id_estado != null) {
    const parsed = parseCatalogoId(input.id_estado, estados, "El estado");
    return parsed.ok ? { ok: true, value: { id_estado: parsed.value } } : parsed;
  }

  const item = findCatalogoByNombre(estados, input.estado);
  if (!item) {
    return fail("El estado de la actividad no es válido.");
  }

  return { ok: true, value: { id_estado: item.id } };
}

export function parsePiezaMuseoInput(input, catalogos = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  const titulo = text(input.titulo, 200, { required: true });
  if (!titulo) return fail("El título de la pieza es obligatorio.");

  const descripcion = text(input.descripcion, 10000, { required: true });
  if (!descripcion) return fail("La descripción es obligatoria.");

  const categoria = parseCatalogoId(
    input.id_categoria_museo,
    catalogos.categoria_museo,
    "La categoría",
  );
  if (!categoria.ok) return categoria;

  const imagenRaw = input.imagen_url === null || input.imagen_url === undefined ? "" : input.imagen_url;
  const imagenUrl = typeof imagenRaw === "string" ? text(imagenRaw, 2000) : null;
  if (!imagenUrl || !allowedMuseoImageUrl(imagenUrl)) {
    return fail("La imagen de la pieza es obligatoria y debe subirse desde el administrador.");
  }

  return {
    ok: true,
    value: {
      titulo,
      descripcion,
      id_categoria_museo: categoria.value,
      fecha_aproximada: text(input.fecha_aproximada, 120),
      lugar_referencia: text(input.lugar_referencia ?? input.lugar, 250),
      imagen_url: imagenUrl,
    },
  };
}

export function normalizeChileMobile(value) {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("56")) digits = digits.slice(2);
  if (!CHILE_MOBILE.test(digits)) return null;
  return `+56 9 ${digits.slice(1, 5)} ${digits.slice(5)}`;
}

export function parseInscripcionInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  const nombre = text(input.nombre, 120, { required: true });
  if (!nombre) return fail("El nombre es obligatorio.");

  const apellido = text(input.apellido, 120, { required: true });
  if (!apellido) return fail("El apellido es obligatorio.");

  const email = text(input.email, 254, { required: true })?.toLowerCase() ?? null;
  if (!email || !EMAIL_PATTERN.test(email)) {
    return fail("Usa un correo con @ y un dominio como .cl o .com.");
  }

  const telefono = normalizeChileMobile(input.telefono ?? "");
  if (!telefono) {
    return fail("Ingresa un celular chileno de 9 dígitos, por ejemplo 9 1234 5678.");
  }

  return {
    ok: true,
    value: {
      nombre,
      apellido,
      email,
      telefono,
    },
  };
}

export function parseAporteMuseoInput(input, catalogos = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  const nombre = text(input.nombre ?? input.nombre_aportante, 160, { required: true });
  if (!nombre) return fail("El nombre es obligatorio.");

  const apellido = text(input.apellido ?? input.apellido_aportante, 160, {
    required: true,
  });
  if (!apellido) return fail("El apellido es obligatorio.");

  const correo = text(input.correo ?? input.correo_aportante, 254, { required: true });
  if (!correo || !EMAIL_PATTERN.test(correo.toLowerCase())) {
    return fail("Usa un correo con @ y un dominio como .cl o .com.");
  }

  const titulo = text(input.titulo, 200, { required: true });
  if (!titulo) return fail("El título es obligatorio.");

  const descripcion = text(input.descripcion, 10000, { required: true });
  if (!descripcion) return fail("La descripción es obligatoria.");

  const categoria = parseCatalogoId(
    input.id_categoria_museo,
    catalogos.categoria_museo,
    "La categoría",
  );
  if (!categoria.ok) return categoria;

  const imagenRaw =
    input.imagen_url === null || input.imagen_url === undefined
      ? ""
      : input.imagen_url;
  const imagenUrl =
    typeof imagenRaw === "string" ? text(imagenRaw, 2000) : null;
  if (imagenUrl && !parseOwnedAporteImageUrl(imagenUrl)) {
    return fail("La imagen adjunta no es válida.");
  }

  return {
    ok: true,
    value: {
      nombre_aportante: nombre,
      apellido_aportante: apellido,
      correo_aportante: correo.toLowerCase(),
      titulo,
      descripcion,
      id_categoria_museo: categoria.value,
      fecha_aproximada: text(input.fecha_aproximada, 120),
      lugar_referencia: text(input.lugar_referencia ?? input.lugar, 250),
      imagen_url: imagenUrl,
    },
  };
}
