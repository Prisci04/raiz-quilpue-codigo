import { MEDIA_MAX_BYTES, MEDIA_TYPES, fileExtension, matchesImageSignature } from "./policy.mjs";

export const MUSEO_FILE_TYPES = { ...MEDIA_TYPES, "application/pdf": "pdf" };
const TYPES = MUSEO_FILE_TYPES;
const EXTENSIONS = { ...Object.fromEntries(Object.entries(TYPES).map(([mime, ext]) => [ext, mime])), jpeg: "image/jpeg" };

function matchesAvif(data) {
  if (data.length < 16) return false;
  const size = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0);
  const text = (offset) => String.fromCharCode(...data.subarray(offset, offset + 4));
  if (text(4) !== "ftyp" || size < 16 || size > data.length || size % 4 !== 0) return false;
  // mif1 por sí solo identifica HEIF; AVIF debe declarar avif o avis.
  if (["avif", "avis"].includes(text(8))) return true;
  for (let offset = 16; offset < size; offset += 4) {
    if (["avif", "avis"].includes(text(offset))) return true;
  }
  return false;
}

function matchesSignature(data, mime) {
  if (mime === "application/pdf") {
    return /^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(String.fromCharCode(...data.subarray(0, 9)));
  }
  if (mime === "image/avif") return matchesAvif(data);
  if (!matchesImageSignature(data, mime)) return false;
  if (mime === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => data[index] === byte);
  }
  if (mime === "image/webp") {
    return ["VP8 ", "VP8L", "VP8X"].includes(String.fromCharCode(...data.subarray(12, 16)));
  }
  return true;
}

export function inspectMuseoFile({ bytes, type, name, size }) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  if (!data.length || size === 0) {
    return { ok: false, code: "VALIDATION", message: "Debes seleccionar un archivo." };
  }
  if (size > MEDIA_MAX_BYTES || data.byteLength > MEDIA_MAX_BYTES) {
    return { ok: false, code: "FILE_TOO_LARGE", message: "El archivo no puede superar los 5 MB." };
  }
  const mime = typeof type === "string" ? type.toLowerCase() : "";
  const extension = fileExtension(name);
  if (!TYPES[mime] || (extension && EXTENSIONS[extension] !== mime) || !matchesSignature(data, mime)) {
    return { ok: false, code: "INVALID_FILE_TYPE", message: "El contenido del archivo debe coincidir con su formato y extensión: JPG, PNG, WEBP, AVIF o PDF." };
  }
  return { ok: true, extension: extension || TYPES[mime] };
}
