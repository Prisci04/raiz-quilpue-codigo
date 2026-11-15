export const CATALOGOS_PUBLICOS = {
  modalidad: {
    table: "modalidad",
    idColumn: "id_modalidad",
    nombreColumn: "nombre_modalidad",
  },
  tipo_participacion: {
    table: "tipo_participacion",
    idColumn: "id_tipo_participacion",
    nombreColumn: "nombre_tipo_participacion",
  },
  costo_actividad: {
    table: "costo_actividad",
    idColumn: "id_costo",
    nombreColumn: "nombre_costo",
  },
  publico_objetivo: {
    table: "publico_objetivo",
    idColumn: "id_publico",
    nombreColumn: "nombre_publico",
  },
  estado_publicacion: {
    table: "estado_publicacion",
    idColumn: "id_estado",
    nombreColumn: "nombre_estado",
  },
  tipo_contenido: {
    table: "tipo_contenido",
    idColumn: "id_tipo_contenido",
    nombreColumn: "nombre_tipo_contenido",
  },
  categoria_museo: {
    table: "categoria_museo",
    idColumn: "id_categoria_museo",
    nombreColumn: "nombre_categoria",
  },
  region: {
    table: "region",
    idColumn: "id_region",
    nombreColumn: "nombre_region",
  },
  comuna: {
    table: "comuna",
    idColumn: "id_comuna",
    nombreColumn: "nombre_comuna",
    extraColumns: ["id_region"],
  },
};

export const CATALOGOS_INTERNOS = {
  estado_inscripcion: {
    table: "estado_inscripcion",
    idColumn: "id_estado_inscripcion",
    nombreColumn: "nombre_estado_inscripcion",
    client: "admin",
  },
  estado_revision: {
    table: "estado_revision",
    idColumn: "id_estado_revision",
    nombreColumn: "nombre_estado_revision",
    client: "admin",
  },
};

export const CATALOGOS = {
  ...CATALOGOS_PUBLICOS,
  ...CATALOGOS_INTERNOS,
};

export const CATALOGO_PUBLICO_NOMBRES = Object.keys(CATALOGOS_PUBLICOS);
export const CATALOGO_ACTIVIDAD_NOMBRES = [
  "modalidad",
  "tipo_participacion",
  "costo_actividad",
  "publico_objetivo",
  "estado_publicacion",
];

export const CATALOGO_CONTENIDO_NOMBRES = ["tipo_contenido", "estado_publicacion"];
export const CATALOGO_MUSEO_NOMBRES = ["categoria_museo", "estado_revision"];

export const NOMBRE_ESTADO_BORRADOR = "Borrador";
export const NOMBRE_ESTADO_PUBLICADA = "Publicada";
export const NOMBRE_ESTADO_FINALIZADA = "Finalizada";
export const NOMBRE_TIPO_NOTICIA = "Noticia";
export const NOMBRE_TIPO_PATRIMONIO = "Patrimonio";
export const NOMBRE_TIPO_CAPSULA = "Cápsula histórica";
export const NOMBRE_TIPO_CULTURA = "Cultura";
export const NOMBRE_TIPO_COMUNIDAD = "Comunidad";
export const NOMBRE_PARTICIPACION_ABIERTA = "Abierta";
export const NOMBRE_PARTICIPACION_INSCRIPCION = "Inscripción";
export const NOMBRE_COSTO_GRATUITA = "Gratuita";
export const NOMBRE_COSTO_PAGADA = "Pagada";
export const NOMBRE_COSTO_APORTE = "Aporte voluntario";
export const NOMBRE_MODALIDAD_PRESENCIAL = "Presencial";
export const NOMBRE_MODALIDAD_VIRTUAL = "Virtual";
export const NOMBRE_MODALIDAD_HIBRIDA = "Híbrida";
export const NOMBRE_PUBLICO_TODAS = "Todas las edades";
export const NOMBRE_PUBLICO_MAYORES = "Mayores de 18 años";
export const NOMBRE_INSCRIPCION_CONFIRMADA = "Confirmada";
export const NOMBRE_INSCRIPCION_ESPERA = "Lista de espera";
export const NOMBRE_INSCRIPCION_CANCELADA = "Cancelada";
export const NOMBRE_REVISION_PENDIENTE = "Pendiente";
export const NOMBRE_REVISION_APROBADO = "Aprobado";
export const NOMBRE_REVISION_RECHAZADO = "Rechazado";
export const NOMBRE_CATEGORIA_FOTOGRAFIAS = "Fotografías";
export const NOMBRE_CATEGORIA_DOCUMENTOS = "Documentos";
export const NOMBRE_CATEGORIA_OBJETOS = "Objetos y piezas";
export const NOMBRE_CATEGORIA_MEMORIAS = "Memorias y relatos";
export const NOMBRE_CATEGORIA_LUGARES = "Lugares de memoria";
export const NOMBRE_CATEGORIA_CULTURA_COMUNIDAD = "Cultura y comunidad";
export const NOMBRE_REGION_DEFAULT = "Valparaíso";
export const NOMBRE_COMUNA_DEFAULT = "Quilpué";

export function getCatalogoDef(nombre) {
  return CATALOGOS[nombre] ?? null;
}

export function isCatalogoPublico(nombre) {
  return Object.hasOwn(CATALOGOS_PUBLICOS, nombre);
}

export function mapCatalogoRow(def, row) {
  const item = {
    id: row[def.idColumn],
    nombre: row[def.nombreColumn],
  };

  for (const column of def.extraColumns ?? []) {
    item[column] = row[column];
  }

  return item;
}

export function findCatalogoById(items, id) {
  const value = Number(id);

  if (!Number.isInteger(value) || value < 1 || !Array.isArray(items)) {
    return null;
  }

  return items.find((item) => Number(item.id) === value) ?? null;
}

export function mismoNombreCatalogo(value, expected) {
  return String(value ?? "").trim().toLowerCase() === String(expected ?? "").trim().toLowerCase();
}

export function findCatalogoByNombre(items, nombre) {
  if (typeof nombre !== "string" || !Array.isArray(items)) {
    return null;
  }

  const needle = nombre.trim().toLowerCase();

  if (!needle) {
    return null;
  }

  return (
    items.find((item) => String(item.nombre ?? "").trim().toLowerCase() === needle) ??
    null
  );
}

export function parseCatalogoId(value, items, label) {
  if (value === "" || value === null || value === undefined) {
    return { ok: false, message: `${label} no es válido.` };
  }

  const item = findCatalogoById(items, value);

  if (!item) {
    return { ok: false, message: `${label} no es válido.` };
  }

  return { ok: true, value: item.id };
}

export function parseOptionalCatalogoId(value, items, label) {
  if (value === "" || value === null || value === undefined) {
    return { ok: true, value: null };
  }

  return parseCatalogoId(value, items, label);
}
