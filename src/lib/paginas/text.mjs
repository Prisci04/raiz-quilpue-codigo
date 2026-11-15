/*
  Helpers de texto puros para guardar y presentar el contenido de las páginas.
  Todo se devuelve como texto plano: React lo escapa al renderizar, así que no
  hay HTML que sanear.
*/

export function normalizeNewlines(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

/** Una línea: los saltos y espacios repetidos pasan a un único espacio. */
export function normalizeTexto(value) {
  return normalizeNewlines(value).replace(/\s+/g, " ").trim();
}

/** Título multilínea: se conservan hasta 4 líneas no vacías. */
export function normalizeTitulo(value) {
  return normalizeNewlines(value)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");
}

/** Párrafos: se conservan los saltos simples y se limita a una línea en blanco entre párrafos. */
export function normalizeParrafos(value) {
  return normalizeNewlines(value)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Separa un texto largo en párrafos (separados por una o más líneas en blanco). */
export function splitParagraphs(value) {
  return normalizeNewlines(value)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Reparte el título de la portada en líneas y decide cuál se destaca.
 *  - Con saltos de línea explícitos se respetan; con 3 líneas se destaca la del medio.
 *  - Sin saltos, se reparten las palabras en 3 grupos (2-2-2 para "Historias que dan forma a Quilpué").
 * @returns {{ lines: string[], emphasisIndex: number | null }}
 */
export function splitTitleLines(value) {
  const text = normalizeNewlines(value).trim();
  if (!text) return { lines: [], emphasisIndex: null };

  const explicit = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (explicit.length > 1) {
    return {
      lines: explicit,
      emphasisIndex: explicit.length === 3 ? 1 : explicit.length === 2 ? 1 : null,
    };
  }

  const words = explicit[0].split(/\s+/);
  if (words.length < 3) return { lines: [explicit[0]], emphasisIndex: null };

  const base = Math.floor(words.length / 3);
  const rest = words.length % 3;
  const sizes = [base + (rest > 0 ? 1 : 0), base + (rest > 1 ? 1 : 0), base];
  const lines = [];
  let cursor = 0;

  for (const size of sizes) {
    lines.push(words.slice(cursor, cursor + size).join(" "));
    cursor += size;
  }

  return { lines, emphasisIndex: 1 };
}

/**
 * Posición de cada valor en la grilla de 12 columnas de Quiénes somos:
 * se alterna 7/5 y 5/7; si el último queda solo en su fila ocupa todo el ancho.
 * @returns {{ preset: number, span: "md:col-span-7" | "md:col-span-5" | "md:col-span-12" }}
 */
export function valorLayout(index, total) {
  const preset = index % 4;
  const alone = index === total - 1 && index % 2 === 0;
  const span = alone ? "md:col-span-12" : preset === 0 || preset === 3 ? "md:col-span-7" : "md:col-span-5";

  return { preset, span };
}

export function initials(name) {
  const parts = normalizeTexto(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export function normalizeKey(value) {
  return normalizeTexto(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
