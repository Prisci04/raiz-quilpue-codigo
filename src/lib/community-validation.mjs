import { parseOptionalDocumento } from "./contenidos/documento.mjs";
import { PUBLICOS_OBJETIVO } from "./actividades.js";
import { parseActividadUbicacion } from "./actividad-ubicacion.mjs";
import { parseOwnedAporteImageUrl, parseOwnedPortadaUrl } from "./media/policy.mjs";

export const MUSEO_CATEGORIES = [
  { id: "fotografias", label: "Fotografías" },
  { id: "documentos", label: "Documentos" },
  { id: "objetos_piezas", label: "Objetos y piezas" },
  { id: "memorias_relatos", label: "Memorias y relatos" },
  { id: "lugares_memoria", label: "Lugares con memoria" },
  { id: "cultura_comunidad", label: "Cultura y comunidad" },
];

const MODALIDADES = ["presencial", "virtual", "hibrida"];
const PARTICIPACIONES = ["abierta", "inscripcion", "pendiente"];
const ESTADOS_ACTIVIDAD = ["borrador", "publicada", "cancelada"];
const ESTADOS_PIEZA = ["borrador", "publicada"];
const VALORES = ["gratuito", "pagado", "voluntario", "pendiente"];
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

function oneOf(value, values) {
  return typeof value === "string" && values.includes(value);
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

function allowedPiezaImageUrl(value) {
  if (!value) return true;
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

export function parseActividadInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  const titulo = text(input.titulo, 180, { required: true });
  if (!titulo) return fail("El nombre de la actividad es obligatorio.");

  const descripcion = text(input.descripcion, 10000, { required: true });
  if (!descripcion) return fail("La descripción es obligatoria.");

  const cupos = nonNegativeInteger(input.cupos);
  if (cupos === undefined) return fail("Los cupos deben ser un número entero mayor o igual a 0.");

  const valorMonto = parseMontoSoloDigitos(input.valor_monto);
  if (valorMonto === undefined) return fail("El monto solo puede contener números.");

  const modalidad = input.modalidad || "presencial";
  if (!oneOf(modalidad, MODALIDADES)) return fail("La modalidad no es válida.");

  const participacion = input.tipo_participacion || "abierta";
  if (!oneOf(participacion, PARTICIPACIONES)) {
    return fail("El tipo de participación no es válido.");
  }

  const tipoValor = input.tipo_valor || "gratuito";
  if (!oneOf(tipoValor, VALORES)) return fail("El tipo de valor no es válido.");

  if (tipoValor === "pagado" && valorMonto === null) {
    return fail("Indica el monto cuando la actividad es pagada.");
  }

  const estado = input.estado || "borrador";
  if (!oneOf(estado, ESTADOS_ACTIVIDAD)) return fail("El estado de la actividad no es válido.");

  const fecha = text(input.fecha, 10);
  if (!validDate(fecha)) return fail("La fecha no es válida.");

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

  const lugar = text(input.lugar, 250);
  if (input.lugar && typeof input.lugar === "string" && input.lugar.trim() && !lugar) {
    return fail("El lugar supera el máximo de 250 caracteres.");
  }
  if (modalidad === "presencial" && !lugar) {
    return fail("Indica el lugar cuando la actividad es presencial.");
  }

  if (!oneOf(input.publico_objetivo, PUBLICOS_OBJETIVO)) {
    return fail("El público objetivo no es válido.");
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
      lugar,
      ...ubicacion.value,
      publico_objetivo: input.publico_objetivo,
      modalidad,
      tipo_participacion: participacion,
      cupos,
      tipo_valor: tipoValor,
      valor_monto: tipoValor === "pagado" ? valorMonto : null,
      forma_pago: text(input.forma_pago, 250),
      informacion_adicional: informacion.value,
      imagen_url: imagenUrl,
      estado,
    },
  };
}

export function parseActividadEstado(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  if (!oneOf(input.estado, ESTADOS_ACTIVIDAD)) {
    return fail("El estado de la actividad no es válido.");
  }

  return { ok: true, value: { estado: input.estado } };
}

export function parsePiezaMuseoInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("La solicitud no es válida.");
  }

  const titulo = text(input.titulo, 200, { required: true });
  if (!titulo) return fail("El título de la pieza es obligatorio.");

  const descripcion = text(input.descripcion, 10000, { required: true });
  if (!descripcion) return fail("La descripción es obligatoria.");

  if (!MUSEO_CATEGORIES.some((category) => category.id === input.categoria)) {
    return fail("La categoría no es válida.");
  }

  const estado = input.estado || "borrador";
  if (!oneOf(estado, ESTADOS_PIEZA)) return fail("El estado de la pieza no es válido.");

  const imagenRaw = input.imagen_url === null || input.imagen_url === undefined ? "" : input.imagen_url;
  const imagenUrl = typeof imagenRaw === "string" ? text(imagenRaw, 2000) : null;
  if (imagenRaw && (!imagenUrl || !allowedPiezaImageUrl(imagenUrl))) {
    return fail("La imagen de la pieza debe subirse desde el administrador.");
  }

  return {
    ok: true,
    value: {
      titulo,
      descripcion,
      categoria: input.categoria,
      fecha_aproximada: text(input.fecha_aproximada, 120),
      lugar: text(input.lugar, 250),
      imagen_url: imagenUrl,
      estado,
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

export function parseAporteMuseoInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const nombre = text(input.nombre, 160, { required: true });
  const correo = text(input.correo, 254, { required: true });
  const titulo = text(input.titulo, 200, { required: true });
  const descripcion = text(input.descripcion, 10000, { required: true });
  const archivoNombre = text(input.archivo_nombre, 255, { required: true });
  if (
    !nombre ||
    !correo ||
    !EMAIL_PATTERN.test(correo.toLowerCase()) ||
    !titulo ||
    !descripcion ||
    !archivoNombre ||
    !MUSEO_CATEGORIES.some((category) => category.id === input.categoria)
  ) {
    return null;
  }
  return {
    nombre,
    correo: correo.toLowerCase(),
    categoria: input.categoria,
    titulo,
    descripcion,
    fecha_aproximada: text(input.fecha_aproximada, 120),
    lugar: text(input.lugar, 250),
    archivo_nombre: archivoNombre,
    informacion_adicional: text(input.informacion_adicional, 3000),
  };
}
