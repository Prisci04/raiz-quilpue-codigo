import {
  mismoNombreCatalogo,
  NOMBRE_TIPO_CAPSULA,
  NOMBRE_TIPO_COMUNIDAD,
  NOMBRE_TIPO_CULTURA,
  NOMBRE_TIPO_NOTICIA,
  NOMBRE_TIPO_PATRIMONIO,
} from "./catalogos.mjs";

const TIPO_CONTENIDO_ALIAS = {
  noticia: NOMBRE_TIPO_NOTICIA,
  patrimonio: NOMBRE_TIPO_PATRIMONIO,
  capsula_historica: NOMBRE_TIPO_CAPSULA,
  "capsula historica": NOMBRE_TIPO_CAPSULA,
  cultura: NOMBRE_TIPO_CULTURA,
  comunidad: NOMBRE_TIPO_COMUNIDAD,
};

function nested(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function esTipoPatrimonio(value) {
  return mismoNombreCatalogo(value, NOMBRE_TIPO_PATRIMONIO);
}

export function tipoContenidoDesdeFiltro(value) {
  if (!value || value === "todos") return "todos";

  const trimmed = String(value).trim();
  if (!trimmed) return "todos";

  return TIPO_CONTENIDO_ALIAS[trimmed.toLowerCase()] ?? trimmed;
}

export function mapContenidoVista(row) {
  if (!row) {
    return null;
  }

  const tipoRel = nested(row.tipo_contenido);

  return {
    id: row.id_contenido ?? row.id,
    title: row.title ?? row.titulo ?? "",
    description: row.description ?? row.descripcion ?? "",
    summary: row.summary ?? row.resumen ?? "",
    tipo: tipoRel?.nombre_tipo_contenido ?? row.tipo ?? "",
    image: row.image ?? row.imagen_url ?? null,
    date: row.date ?? row.fec_publicacion ?? row.fecha_publicacion ?? null,
    createdAt: row.createdAt ?? row.fec_creacion ?? row.fecha_creacion ?? null,
  };
}

export function mapContenidoDetalle(row) {
  const vista = mapContenidoVista(row);

  if (!vista) {
    return null;
  }

  return {
    ...vista,
    body: row.body ?? row.contenido ?? null,
  };
}
