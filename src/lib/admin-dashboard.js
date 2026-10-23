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
