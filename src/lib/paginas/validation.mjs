import { LIMITES, getPagina, getSeccion } from "./estructura.mjs";
import { validation } from "./errors.mjs";
import {
  normalizeParrafos,
  normalizeTexto,
  normalizeTitulo,
} from "./text.mjs";

const NORMALIZADORES = {
  texto: normalizeTexto,
  titulo: normalizeTitulo,
  parrafos: normalizeParrafos,
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(body, message = "El cuerpo de la solicitud no es válido.") {
  if (!isPlainObject(body)) {
    throw validation(message);
  }

  return body;
}

function requireString(value, label) {
  if (typeof value !== "string") {
    throw validation(`${label} debe ser texto.`);
  }

  return value;
}

export function parseId(value, label = "El identificador") {
  const text = String(value ?? "").trim();

  if (!/^[1-9]\d{0,9}$/.test(text)) {
    throw validation(`${label} no es válido.`);
  }

  const id = Number(text);

  if (!Number.isSafeInteger(id) || id > 2147483647) {
    throw validation(`${label} no es válido.`);
  }

  return id;
}

export function parsePaginaId(value) {
  const id = parseId(value, "La página");

  if (!getPagina(id)) {
    throw validation("La página indicada no existe.");
  }

  return id;
}

export function parseSeccionCodigo(idPagina, value) {
  const codigo = String(value ?? "");
  const seccion = getSeccion(idPagina, codigo);

  if (!seccion) {
    throw validation("La sección indicada no existe en esta página.");
  }

  return seccion;
}

function readText(raw, label, { max, required = false, tipo = "texto" }) {
  const text = NORMALIZADORES[tipo](requireString(raw, label));

  if (required && !text) {
    throw validation(`${label} es obligatorio.`);
  }

  if (text.length > max) {
    throw validation(`${label} no puede superar ${max} caracteres.`);
  }

  return text;
}

/**
 * Valida la edición de campos de una sección. Solo se aceptan códigos que ya existen
 * en la estructura fija; no se pueden crear campos nuevos.
 * @returns {Record<string, string>} valores normalizados por código de campo
 */
export function parseCamposPayload(idPagina, seccionDef, body) {
  const campos = requireObject(requireObject(body).campos, "Indica los campos que deseas actualizar.");
  const codigos = Object.keys(campos);

  if (codigos.length === 0) {
    throw validation("No hay cambios para guardar.");
  }

  const result = {};

  for (const codigo of codigos) {
    const def = seccionDef.campos.find((campo) => campo.codigo === codigo);

    if (!def) {
      throw validation(`El campo "${codigo}" no existe en esta sección.`);
    }

    result[codigo] = readText(campos[codigo], def.etiqueta, {
      max: def.max,
      required: def.requerido,
      tipo: def.tipo,
    });
  }

  return result;
}

export function parseValorInput(body) {
  const data = requireObject(body);
  const limites = LIMITES.valores;
  const textoSuperior = data.texto_superior == null || data.texto_superior === ""
    ? ""
    : readText(data.texto_superior, "El texto superior", { max: limites.texto_superior });

  return {
    texto_superior: textoSuperior || null,
    titulo: readText(data.titulo, "El título", { max: limites.titulo, required: true }),
    descripcion: readText(data.descripcion ?? "", "La descripción", {
      max: limites.descripcion,
      tipo: "parrafos",
    }),
  };
}

export function parseIntegranteInput(body) {
  const data = requireObject(body);
  const limites = LIMITES.integrantes;
  const descripcion = data.descripcion == null || data.descripcion === ""
    ? ""
    : readText(data.descripcion, "La descripción", {
        max: limites.descripcion,
        tipo: "parrafos",
      });

  return {
    id_cargo: parseId(data.id_cargo, "El cargo"),
    nombre_integrante: readText(data.nombre_integrante, "El nombre", {
      max: limites.nombre,
      required: true,
    }),
    descripcion: descripcion || null,
  };
}

function parseIdList(value, label) {
  if (!Array.isArray(value)) {
    throw validation(`${label} debe ser una lista.`);
  }

  const ids = value.map((item) => parseId(item, "Un identificador de la lista"));

  if (new Set(ids).size !== ids.length) {
    throw validation(`${label} contiene elementos repetidos.`);
  }

  return ids;
}

/** Orden completo de una lista administrable (valores o integrantes). */
export function parseOrdenPayload(body) {
  const ids = parseIdList(requireObject(body).ids, "El orden");

  if (ids.length === 0) {
    throw validation("El orden no puede estar vacío.");
  }

  return ids;
}

/** Imágenes de una sección en el orden deseado (puede ser vacío para quitarlas todas). */
export function parseImagenesSeccionPayload(body, seccionDef) {
  const ids = parseIdList(requireObject(body).ids, "Las imágenes");
  const max = seccionDef.imagenes?.max ?? 0;

  if (ids.length > max) {
    throw validation(`Esta sección admite hasta ${max} imágenes.`);
  }

  return ids;
}

/** Foto de un integrante: id de una imagen registrada o null para quitarla. */
export function parseImagenIntegrantePayload(body) {
  const data = requireObject(body);

  if (!("id_imagen" in data)) {
    throw validation("Indica la imagen o null para quitarla.");
  }

  return data.id_imagen === null ? null : parseId(data.id_imagen, "La imagen");
}

export function parseImagenDescripcion(body) {
  const data = requireObject(body);
  const raw = data.descripcion_imagen;

  if (raw == null || raw === "") {
    return null;
  }

  return readText(raw, "La descripción de la imagen", {
    max: LIMITES.imagen.descripcion,
  }) || null;
}

/** Descripción opcional que acompaña a una subida multipart (campo de formulario). */
export function parseDescripcionFormulario(raw) {
  if (raw == null || raw === "") {
    return null;
  }

  return parseImagenDescripcion({ descripcion_imagen: String(raw) });
}
