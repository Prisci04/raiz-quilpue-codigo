import {
  NOMBRE_CATEGORIA_CULTURA_COMUNIDAD,
  NOMBRE_CATEGORIA_DOCUMENTOS,
  NOMBRE_CATEGORIA_FOTOGRAFIAS,
  NOMBRE_CATEGORIA_LUGARES,
  NOMBRE_CATEGORIA_MEMORIAS,
  NOMBRE_CATEGORIA_OBJETOS,
  NOMBRE_TIPO_CAPSULA,
  NOMBRE_TIPO_COMUNIDAD,
  NOMBRE_TIPO_CULTURA,
  NOMBRE_TIPO_NOTICIA,
  NOMBRE_TIPO_PATRIMONIO,
} from "./catalogos.mjs";

export const CONTENT_TYPE_LABELS = {
  [NOMBRE_TIPO_NOTICIA]: "Noticias",
  [NOMBRE_TIPO_PATRIMONIO]: "Patrimonio",
  [NOMBRE_TIPO_CAPSULA]: "Cápsulas históricas",
  [NOMBRE_TIPO_CULTURA]: "Cultura",
  [NOMBRE_TIPO_COMUNIDAD]: "Comunidad",
};

export const CONTENT_TYPE_COLORS = {
  [NOMBRE_TIPO_NOTICIA]: "#c4a04a",
  [NOMBRE_TIPO_PATRIMONIO]: "#6b3f28",
  [NOMBRE_TIPO_CAPSULA]: "#d06a3a",
  [NOMBRE_TIPO_CULTURA]: "#687a42",
  [NOMBRE_TIPO_COMUNIDAD]: "#b08968",
};

export const MUSEUM_CATEGORY_LABELS = {
  [NOMBRE_CATEGORIA_FOTOGRAFIAS]: NOMBRE_CATEGORIA_FOTOGRAFIAS,
  [NOMBRE_CATEGORIA_DOCUMENTOS]: NOMBRE_CATEGORIA_DOCUMENTOS,
  [NOMBRE_CATEGORIA_OBJETOS]: NOMBRE_CATEGORIA_OBJETOS,
  [NOMBRE_CATEGORIA_MEMORIAS]: NOMBRE_CATEGORIA_MEMORIAS,
  [NOMBRE_CATEGORIA_LUGARES]: NOMBRE_CATEGORIA_LUGARES,
  [NOMBRE_CATEGORIA_CULTURA_COMUNIDAD]: NOMBRE_CATEGORIA_CULTURA_COMUNIDAD,
};

export const MUSEUM_CATEGORY_COLORS = {
  [NOMBRE_CATEGORIA_FOTOGRAFIAS]: "#c4a04a",
  [NOMBRE_CATEGORIA_DOCUMENTOS]: "#6b3f28",
  [NOMBRE_CATEGORIA_OBJETOS]: "#d06a3a",
  [NOMBRE_CATEGORIA_MEMORIAS]: "#687a42",
  [NOMBRE_CATEGORIA_LUGARES]: "#b08968",
  [NOMBRE_CATEGORIA_CULTURA_COMUNIDAD]: "#946541",
};

export function formatDashboardDate(date = new Date()) {
  const formatted = date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function buildContentSlices(items = []) {
  if (!items.length) return [];

  const counts = new Map();

  for (const item of items) {
    const key = item.tipo || NOMBRE_TIPO_COMUNIDAD;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.keys(CONTENT_TYPE_LABELS)
    .map((id) => ({
      id,
      label: CONTENT_TYPE_LABELS[id],
      value: counts.get(id) ?? 0,
      color: CONTENT_TYPE_COLORS[id],
    }))
    .filter((slice) => slice.value > 0);
}

export function buildCategorySlices(counts, labels, colors) {
  return Object.keys(labels).map((id) => ({
    id,
    label: labels[id],
    value: counts[id] ?? 0,
    color: colors[id],
  }));
}

export function formatCompactNumber(value) {
  const numeric = Number(value) || 0;

  if (numeric >= 1000) {
    const compact = numeric / 1000;
    const digits = compact >= 10 || Number.isInteger(compact) ? 0 : 1;
    return `${compact.toFixed(digits).replace(".", ",")}K`;
  }

  return String(numeric);
}
