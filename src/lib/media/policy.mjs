export const MEDIA_BUCKET = "public-media";
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const MEDIA_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const EXTENSION_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/*
  Carpetas que el backend puede construir. El endpoint solo habilita
  las combinaciones de MEDIA_UPLOADS; el resto queda listo para después.
*/
const FOLDERS = {
  contenidos: {
    portada: (registroId) => `contenidos/${registroId}/portada`,
  },
  actividades: {
    portada: (registroId) => `actividades/${registroId}/portada`,
    galeria: (registroId) => `actividades/${registroId}/galeria`,
  },
  museo: {
    portada: (registroId) => `museo/${registroId}/portada`,
  },
};

export const MEDIA_UPLOADS = {
  contenidos: ["portada"],
  actividades: ["portada"],
  museo: ["portada"],
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OWNED_PORTADA =
  /^(contenidos|actividades|museo)\/([1-9][0-9]*)\/portada\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp|avif)$/i;

const APORTE_IMAGE =
  /^museo\/aportes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|avif)$/i;

export function supabaseProjectHostname(envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (typeof envUrl !== "string" || !envUrl.trim()) return null;

  try {
    const url = new URL(envUrl.trim());

    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)) return null;

    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function mediaTarget(contexto, tipoImagen, registroId) {
  const allowed = MEDIA_UPLOADS[contexto];

  if (!allowed?.includes(tipoImagen)) return null;

  const folderFor = FOLDERS[contexto]?.[tipoImagen];
  const id = typeof registroId === "string" ? registroId.trim() : String(registroId ?? "");

  if (!folderFor || !/^[1-9][0-9]*$/.test(id)) return null;

  return {
    contexto,
    tipoImagen,
    registroId: Number(id),
    folder: folderFor(id),
  };
}

const PAGINA_SLUG = /^[a-z][a-z0-9-]{1,40}$/;
const PAGINA_SECCION = /^[a-z][a-z0-9_]{1,60}$/;
const PAGINA_OBJECT_PATH =
  /^paginas\/[a-z][a-z0-9-]{1,40}\/[a-z][a-z0-9_]{1,60}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/i;

export function paginaMediaTarget(paginaSlug, seccionCodigo) {
  if (!PAGINA_SLUG.test(paginaSlug ?? "") || !PAGINA_SECCION.test(seccionCodigo ?? "")) {
    return null;
  }

  return { folder: `paginas/${paginaSlug}/${seccionCodigo}` };
}

/** Solo los archivos creados por este módulo pueden eliminarse físicamente. */
export function isPaginaObjectPath(path) {
  return typeof path === "string" && PAGINA_OBJECT_PATH.test(path);
}

export function extensionForType(mime) {
  return MEDIA_TYPES[mime] ?? null;
}

export function fileExtension(name) {
  if (typeof name !== "string") return "";

  const base = name.split(/[/\\]/).pop() ?? "";
  const match = base.toLowerCase().match(/\.([a-z0-9]+)$/);

  return match?.[1] ?? "";
}

export function matchesImageSignature(bytes, mime) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);

  if (mime === "image/jpeg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }

  if (mime === "image/png") {
    return (
      data.length >= 8 &&
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    );
  }

  if (mime === "image/webp") {
    return (
      data.length >= 12 &&
      data[0] === 0x52 &&
      data[1] === 0x49 &&
      data[2] === 0x46 &&
      data[3] === 0x46 &&
      data[8] === 0x57 &&
      data[9] === 0x45 &&
      data[10] === 0x42 &&
      data[11] === 0x50
    );
  }

  if (mime === "image/avif") {
    if (data.length < 12) return false;
    const box = String.fromCharCode(data[4], data[5], data[6], data[7]);
    const brand = String.fromCharCode(data[8], data[9], data[10], data[11]);

    return box === "ftyp" && (brand === "avif" || brand === "avis" || brand === "mif1");
  }

  return false;
}

export function inspectImageFile({ bytes, type, name, size }) {
  if (!bytes || size === 0 || bytes.byteLength === 0) {
    return { ok: false, status: 400, code: "INVALID_FILE", message: "El archivo no es válido." };
  }

  if (size > MEDIA_MAX_BYTES || bytes.byteLength > MEDIA_MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "FILE_TOO_LARGE",
      message: "La imagen supera el máximo de 5 MB.",
    };
  }

  const mime = typeof type === "string" ? type.toLowerCase() : "";
  const extension = extensionForType(mime);
  const named = fileExtension(name);

  if (!extension || (named && EXTENSION_TYPES[named] !== mime)) {
    return {
      ok: false,
      status: 415,
      code: "UNSUPPORTED_MEDIA",
      message: "El formato de imagen no está permitido.",
    };
  }

  if (!matchesImageSignature(bytes, mime)) {
    return {
      ok: false,
      status: 415,
      code: "UNSUPPORTED_MEDIA",
      message: "El formato de imagen no está permitido.",
    };
  }

  return { ok: true, mime, extension };
}

const SAFE_EXTENSIONS = new Set(Object.values(MEDIA_TYPES));

export function buildObjectPath(target, extension) {
  if (!target?.folder || !SAFE_EXTENSIONS.has(extension)) {
    return null;
  }

  if (target.folder.split("/").some((part) => !part || part === "." || part === "..")) {
    return null;
  }

  return `${target.folder}/${crypto.randomUUID()}.${extension}`;
}

export function buildAporteObjectPath(extension) {
  if (!SAFE_EXTENSIONS.has(extension)) return null;
  return `museo/aportes/${crypto.randomUUID()}.${extension}`;
}

function parseProjectPublicMedia(value, envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (typeof value !== "string" || !value.trim()) return null;

  const hostname = supabaseProjectHostname(envUrl);
  if (!hostname) return null;

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.search) return null;
  if (url.hostname.toLowerCase() !== hostname) return null;

  const prefix = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  if (!url.pathname.startsWith(prefix)) return null;

  let objectPath;
  try {
    objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return null;
  }

  return { objectPath, publicUrl: url.href };
}

export function parseOwnedPortadaUrl(value, envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const parsed = parseProjectPublicMedia(value, envUrl);
  if (!parsed) return null;

  const match = OWNED_PORTADA.exec(parsed.objectPath);
  if (!match || !UUID.test(match[3])) return null;

  return {
    bucket: MEDIA_BUCKET,
    contexto: match[1].toLowerCase(),
    path: parsed.objectPath,
    registroId: Number(match[2]),
    publicUrl: parsed.publicUrl,
  };
}

export function parseOwnedAporteImageUrl(value, envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const parsed = parseProjectPublicMedia(value, envUrl);
  if (!parsed || !APORTE_IMAGE.test(parsed.objectPath)) return null;

  return {
    bucket: MEDIA_BUCKET,
    path: parsed.objectPath,
    publicUrl: parsed.publicUrl,
  };
}
