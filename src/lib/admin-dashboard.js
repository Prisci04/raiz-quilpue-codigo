//metricas fake


export const CONTENT_TYPE_LABELS = {
  noticia: "Noticias",
  patrimonio: "Patrimonio",
  capsula_historica: "Historias",
  cultura: "Cultura",
  comunidad: "Comunidad",
};

export const CONTENT_TYPE_COLORS = {
  noticia: "#c4a04a",
  patrimonio: "#6b3f28",
  capsula_historica: "#d06a3a",
  cultura: "#687a42",
  comunidad: "#b08968",
};

export const VISITS_BY_MONTH = [
  { label: "Mar", value: 460 },
  { label: "Abr", value: 590 },
  { label: "May", value: 530 },
  { label: "Jun", value: 700 },
  { label: "Jul", value: 820 },
  { label: "Ago", value: 940 },
  { label: "Sep", value: 1020 },
];

export const ENROLLMENTS_BY_ACTIVITY = [
  { label: "Visita Guiada", value: 24 },
  { label: "Foto Patrimonial", value: 18 },
  { label: "Conferencia", value: 36 },
  { label: "Exposición", value: 0 },
  { label: "Festival", value: 90 },
];

export const REACTIONS_BY_MONTH = [
  { label: "Mar", value: 95 },
  { label: "Abr", value: 125 },
  { label: "May", value: 110 },
  { label: "Jun", value: 175 },
  { label: "Jul", value: 190 },
  { label: "Ago", value: 215 },
  { label: "Sep", value: 255 },
];

export const DEFAULT_CONTENT_SLICES = [
  { id: "noticia", label: "Noticias", value: 20, color: CONTENT_TYPE_COLORS.noticia },
  { id: "patrimonio", label: "Patrimonio", value: 36, color: CONTENT_TYPE_COLORS.patrimonio },
  { id: "capsula_historica", label: "Historias", value: 18, color: CONTENT_TYPE_COLORS.capsula_historica },
  { id: "cultura", label: "Cultura", value: 12, color: CONTENT_TYPE_COLORS.cultura },
  { id: "comunidad", label: "Comunidad", value: 7, color: CONTENT_TYPE_COLORS.comunidad },
];

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
  if (!items.length) return DEFAULT_CONTENT_SLICES;

  const counts = new Map();

  for (const item of items) {
    const key = item.tipo || "comunidad";
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

export function formatCompactNumber(value) {
  const numeric = Number(value) || 0;

  if (numeric >= 1000) {
    const compact = numeric / 1000;
    const digits = compact >= 10 || Number.isInteger(compact) ? 0 : 1;
    return `${compact.toFixed(digits).replace(".", ",")}K`;
  }

  return String(numeric);
}
