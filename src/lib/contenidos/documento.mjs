import {
  NOMBRE_TIPO_CAPSULA,
  NOMBRE_TIPO_COMUNIDAD,
  NOMBRE_TIPO_CULTURA,
  NOMBRE_TIPO_NOTICIA,
  NOMBRE_TIPO_PATRIMONIO,
} from "../catalogos.mjs";

export const TITULO_MAX_LENGTH = 200;
export const DESCRIPCION_MAX_LENGTH = 300;
export const RESUMEN_MAX_LENGTH = 4000;
export const IMAGEN_URL_MAX_LENGTH = 2000;
export const CONTENIDO_TEXT_MAX_LENGTH = 50000;

/* Etiquetas en singular para el panel administrativo. */
export const TIPO_LABELS_ADMIN = {
  [NOMBRE_TIPO_NOTICIA]: NOMBRE_TIPO_NOTICIA,
  [NOMBRE_TIPO_PATRIMONIO]: NOMBRE_TIPO_PATRIMONIO,
  [NOMBRE_TIPO_CAPSULA]: NOMBRE_TIPO_CAPSULA,
  [NOMBRE_TIPO_CULTURA]: NOMBRE_TIPO_CULTURA,
  [NOMBRE_TIPO_COMUNIDAD]: NOMBRE_TIPO_COMUNIDAD,
};

/* Etiquetas en plural para el portal público. */
export const TIPO_LABELS_PUBLICO = {
  [NOMBRE_TIPO_NOTICIA]: "Noticias",
  [NOMBRE_TIPO_PATRIMONIO]: NOMBRE_TIPO_PATRIMONIO,
  [NOMBRE_TIPO_CAPSULA]: "Cápsulas históricas",
  [NOMBRE_TIPO_CULTURA]: NOMBRE_TIPO_CULTURA,
  [NOMBRE_TIPO_COMUNIDAD]: NOMBRE_TIPO_COMUNIDAD,
};

export const DEFAULT_TEXT_COLOR = "#704a31";

export const TEXT_COLORS = [
  { id: "oscuro", label: "Café oscuro", value: "#2c1810" },
  { id: "cafe", label: "Café", value: DEFAULT_TEXT_COLOR },
  { id: "terracota", label: "Terracota", value: "#c45a3a" },
  { id: "oliva", label: "Verde oliva", value: "#687a42" },
  { id: "tierra", label: "Tierra", value: "#7c5c47" },
];

const TOP_LEVEL = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "image",
]);

function fail(message) {
  return { ok: false, message };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeTextColor(value) {
  if (typeof value !== "string") return null;

  const raw = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;

  const short = raw.match(/^#([0-9a-f]{3})$/);
  if (short) {
    const [red, green, blue] = short[1];
    return `#${red}${red}${green}${green}${blue}${blue}`;
  }

  const rgb = raw.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/,
  );
  if (rgb) {
    const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if (channels.every((channel) => channel <= 255)) {
      return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    }
  }

  return null;
}

export function isAllowedTextColor(value) {
  return Boolean(normalizeTextColor(value));
}

export function stripPastedTextColors(html) {
  if (typeof html !== "string") return html;

  return html
    .replace(/\s*style=(["'])([\s\S]*?)\1/gi, (match, quote, style) => {
      const cleaned = String(style)
        .replace(/(?:^|;)\s*(?:color|background-color)\s*:[^;]*/gi, "")
        .replace(/^;+|;+$/g, "")
        .trim();
      return cleaned ? ` style=${quote}${cleaned}${quote}` : "";
    })
    .replace(/\s*color=(["']).*?\1/gi, "")
    .replace(/<\/?font\b[^>]*>/gi, "");
}

export function safeContenidoHref(value) {
  if (typeof value !== "string") return null;

  const href = value.trim();

  if (!href || href.startsWith("//") || href.length > IMAGEN_URL_MAX_LENGTH) {
    return null;
  }

  if (href.startsWith("/")) return href;

  try {
    const url = new URL(href);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function readMarks(marks) {
  if (marks === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(marks)) {
    return fail("El contenido incluye un formato no permitido.");
  }

  const clean = [];

  for (const mark of marks) {
    if (!isRecord(mark) || typeof mark.type !== "string") {
      return fail("El contenido incluye un formato no permitido.");
    }

    if (mark.type === "bold" || mark.type === "italic" || mark.type === "underline") {
      clean.push({ type: mark.type });
      continue;
    }

    if (mark.type === "link") {
      const href = safeContenidoHref(mark.attrs?.href);

      if (!href) {
        return fail("Hay un enlace que no es válido.");
      }

      clean.push({ type: "link", attrs: { href } });
      continue;
    }

    if (mark.type === "textStyle") {
      const color = normalizeTextColor(mark.attrs?.color);

      if (!color || color === DEFAULT_TEXT_COLOR) {
        continue;
      }

      clean.push({ type: "textStyle", attrs: { color } });
      continue;
    }

    return fail("El contenido incluye un formato no permitido.");
  }

  return { ok: true, value: clean.length > 0 ? clean : undefined };
}

function readNode(node, parentType, state, depth) {
  if (depth > 12 || state.nodes > 2000) {
    return fail("El contenido es demasiado extenso.");
  }

  if (!isRecord(node) || typeof node.type !== "string") {
    return fail("El contenido completo no es válido.");
  }

  state.nodes += 1;

  if (node.type === "text") {
    if (typeof node.text !== "string") {
      return fail("El contenido completo no es válido.");
    }

    state.textLength += node.text.trim().length;

    if (state.textLength > CONTENIDO_TEXT_MAX_LENGTH) {
      return fail("El contenido es demasiado extenso.");
    }

    const marks = readMarks(node.marks);

    if (!marks.ok) return marks;

    const clean = { type: "text", text: node.text };

    if (marks.value) clean.marks = marks.value;

    return { ok: true, value: clean };
  }

  if (node.type === "hardBreak") {
    return { ok: true, value: { type: "hardBreak" } };
  }

  if (node.type === "image") {
    const src = safeContenidoHref(node.attrs?.src);

    if (!src) {
      return fail("Hay una imagen del contenido que no es válida.");
    }

    const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.slice(0, 200) : "";

    return { ok: true, value: { type: "image", attrs: { src, alt } } };
  }

  const children = readChildren(node.content, node.type, state, depth + 1);

  if (!children.ok) return children;

  if (node.type === "paragraph") {
    return { ok: true, value: { type: "paragraph", content: children.value } };
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level);

    if (level !== 2 && level !== 3) {
      return fail("Solo se permiten subtítulos H2 y H3.");
    }

    return {
      ok: true,
      value: { type: "heading", attrs: { level }, content: children.value },
    };
  }

  if (node.type === "blockquote") {
    return { ok: true, value: { type: "blockquote", content: children.value } };
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return { ok: true, value: { type: node.type, content: children.value } };
  }

  if (node.type === "listItem") {
    return { ok: true, value: { type: "listItem", content: children.value } };
  }

  return fail("El contenido incluye un formato no permitido.");
}

function allowedChild(parentType, childType) {
  if (parentType === "doc") return TOP_LEVEL.has(childType);
  if (parentType === "bulletList" || parentType === "orderedList") return childType === "listItem";
  if (parentType === "listItem") {
    return (
      childType === "paragraph" ||
      childType === "heading" ||
      childType === "blockquote" ||
      childType === "bulletList" ||
      childType === "orderedList"
    );
  }

  if (parentType === "blockquote") {
    return childType === "paragraph" || childType === "heading";
  }
  if (parentType === "paragraph" || parentType === "heading") {
    return childType === "text" || childType === "hardBreak";
  }

  return false;
}

function readChildren(content, parentType, state, depth) {
  if (content === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(content)) {
    return fail("El contenido completo no es válido.");
  }

  const clean = [];

  for (const child of content) {
    if (!isRecord(child) || !allowedChild(parentType, child.type)) {
      return fail("El contenido incluye un formato no permitido.");
    }

    const parsed = readNode(child, parentType, state, depth);

    if (!parsed.ok) return parsed;

    clean.push(parsed.value);
  }

  return { ok: true, value: clean };
}

export function parseDocumento(value) {
  if (!isRecord(value) || value.type !== "doc") {
    return fail("El contenido completo no es válido.");
  }

  const state = { nodes: 0, textLength: 0 };
  const content = readChildren(value.content, "doc", state, 0);

  if (!content.ok) return content;

  if (state.textLength === 0) {
    return fail("El contenido completo es obligatorio.");
  }

  return { ok: true, value: { type: "doc", content: content.value } };
}

export function parseOptionalDocumento(value) {
  if (value == null || value === "") {
    return { ok: true, value: null };
  }

  const parsed = parseDocumento(value);

  if (!parsed.ok && parsed.message === "El contenido completo es obligatorio.") {
    return { ok: true, value: null };
  }

  return parsed;
}
