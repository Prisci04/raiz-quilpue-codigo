export const TITULO_MAX_LENGTH = 200;
export const DESCRIPCION_MAX_LENGTH = 300;
export const RESUMEN_MAX_LENGTH = 4000;
export const IMAGEN_URL_MAX_LENGTH = 2000;
export const CONTENIDO_TEXT_MAX_LENGTH = 50000;

export const TIPOS_CONTENIDO = [
  "noticia",
  "patrimonio",
  "capsula_historica",
  "cultura",
  "comunidad",
];
export const ESTADOS_CONTENIDO = ["borrador", "publicada"];

/* Etiquetas en singular para el panel administrativo. */
export const TIPO_LABELS_ADMIN = {
  noticia: "Noticia",
  patrimonio: "Patrimonio",
  capsula_historica: "Cápsula histórica",
  cultura: "Cultura",
  comunidad: "Comunidad",
};

/* Etiquetas en plural para el portal público. */
export const TIPO_LABELS_PUBLICO = {
  noticia: "Noticias",
  patrimonio: "Patrimonio",
  capsula_historica: "Cápsulas históricas",
  cultura: "Cultura",
  comunidad: "Comunidad",
};

export const TEXT_COLORS = [
  { id: "normal", label: "Texto normal", value: null },
  { id: "cafe", label: "Café", value: "#704a31" },
  { id: "terracota", label: "Terracota", value: "#c45a3a" },
  { id: "oliva", label: "Verde oliva", value: "#687a42" },
  { id: "gris", label: "Gris", value: "#7c5c47" },
];

const ALLOWED_COLORS = new Set(
  TEXT_COLORS.map((color) => color.value).filter(Boolean),
);

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

export function isAllowedTextColor(value) {
  return typeof value === "string" && ALLOWED_COLORS.has(value.trim().toLowerCase());
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
      const color =
        typeof mark.attrs?.color === "string" ? mark.attrs.color.trim().toLowerCase() : "";

      if (!ALLOWED_COLORS.has(color)) {
        return fail("Hay un color de texto que no está permitido.");
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
