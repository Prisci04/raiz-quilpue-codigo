import {
  DESCRIPCION_MAX_LENGTH,
  ESTADOS_CONTENIDO,
  IMAGEN_URL_MAX_LENGTH,
  RESUMEN_MAX_LENGTH,
  TIPOS_CONTENIDO,
  TITULO_MAX_LENGTH,
  parseDocumento,
} from "./documento.mjs";
import { parseOwnedPortadaUrl } from "../media/policy.mjs";

function fail(message) {
  return { ok: false, message };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredText(value, maxLength, emptyMessage, longMessage) {
  if (typeof value !== "string") {
    return fail(emptyMessage);
  }

  const text = value.trim();

  if (!text) return fail(emptyMessage);

  if (text.length > maxLength) return fail(longMessage);

  return { ok: true, value: text };
}

function readTipo(value) {
  if (typeof value !== "string" || !TIPOS_CONTENIDO.includes(value)) {
    return fail("El tipo de contenido no es válido.");
  }

  return { ok: true, value };
}

function readEstado(value) {
  if (typeof value !== "string" || !ESTADOS_CONTENIDO.includes(value)) {
    return fail("El estado no es válido.");
  }

  return { ok: true, value };
}

function readImagen(value, { allowOmit }) {
  if (value === undefined && allowOmit) {
    return { ok: true, value: undefined };
  }

  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return fail("La imagen de portada no es válida.");
  }

  const owned = parseOwnedPortadaUrl(value.trim());

  if (
    !owned ||
    owned.contexto !== "contenidos" ||
    owned.publicUrl.length > IMAGEN_URL_MAX_LENGTH
  ) {
    return fail("La imagen de portada no es válida.");
  }

  return { ok: true, value: owned.publicUrl };
}

function readFields(body, { allowOmitImage }) {
  if (!isRecord(body)) {
    return fail("La solicitud no es válida.");
  }

  const titulo = readRequiredText(
    body.titulo,
    TITULO_MAX_LENGTH,
    "El título es obligatorio.",
    `El título supera el máximo de ${TITULO_MAX_LENGTH} caracteres.`,
  );
  if (!titulo.ok) return titulo;

  const descripcion = readRequiredText(
    body.descripcion,
    DESCRIPCION_MAX_LENGTH,
    "La descripción de la tarjeta es obligatoria.",
    `La descripción supera el máximo de ${DESCRIPCION_MAX_LENGTH} caracteres.`,
  );
  if (!descripcion.ok) return descripcion;

  const resumen = readRequiredText(
    body.resumen,
    RESUMEN_MAX_LENGTH,
    "El resumen es obligatorio.",
    `El resumen supera el máximo de ${RESUMEN_MAX_LENGTH} caracteres.`,
  );
  if (!resumen.ok) return resumen;

  const tipo = readTipo(body.tipo);
  if (!tipo.ok) return tipo;

  const estado = readEstado(body.estado);
  if (!estado.ok) return estado;

  const imagen = readImagen(body.imagen_url, { allowOmit: allowOmitImage });
  if (!imagen.ok) return imagen;

  const contenido = parseDocumento(body.contenido);
  if (!contenido.ok) return contenido;

  return {
    ok: true,
    value: {
      titulo: titulo.value,
      descripcion: descripcion.value,
      resumen: resumen.value,
      tipo: tipo.value,
      estado: estado.value,
      imagen_url: imagen.value,
      contenido: contenido.value,
    },
  };
}

export function parseCreateContenido(body) {
  return readFields(body, { allowOmitImage: false });
}

export function parseUpdateContenido(body) {
  return readFields(body, { allowOmitImage: true });
}

export function parseEstadoContenido(body) {
  if (!isRecord(body) || Object.keys(body).length !== 1) {
    return fail("La solicitud no es válida.");
  }

  const estado = readEstado(body.estado);

  if (!estado.ok) return estado;

  return { ok: true, value: { estado: estado.value } };
}
