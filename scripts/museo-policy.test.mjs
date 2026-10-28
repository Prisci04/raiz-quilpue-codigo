import assert from "node:assert/strict";
import test from "node:test";
import { inspectMuseoFile } from "../src/lib/media/museo-policy.mjs";
import { MEDIA_MAX_BYTES, inspectImageFile } from "../src/lib/media/policy.mjs";

const bytes = (...values) => Uint8Array.from(values);
const ascii = (text) => new TextEncoder().encode(text);
const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0);
const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const webp = new Uint8Array([...ascii("RIFF"), 12, 0, 0, 0, ...ascii("WEBPVP8 ")]);
const avif = new Uint8Array([0, 0, 0, 24, ...ascii("ftypavif"), 0, 0, 0, 0, ...ascii("mif1avif")]);
const pdf = ascii("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const inspect = (data, type, name, size = data.length) => inspectMuseoFile({ bytes: data, type, name, size });

test("acepta firmas de JPEG, PNG, WebP, AVIF y PDF con MIME y extensión coherentes", () => {
  for (const [data, type, name] of [
    [jpeg, "image/jpeg", "foto.JPEG"], [png, "image/png", "foto.png"],
    [webp, "image/webp", "foto.webp"], [avif, "image/avif", "foto.avif"],
    [pdf, "application/pdf", "memoria.pdf"], [ascii("%PDF-2.0\r\n"), "application/pdf", "memoria.pdf"],
  ]) assert.equal(inspect(data, type, name).ok, true, name);
});

test("rechaza MIME falso, extensión falsa y ejecutable renombrado", () => {
  for (const input of [
    [png, "image/jpeg", "foto.jpg"], [jpeg, "image/jpeg", "foto.exe"],
    [pdf, "application/pdf", "foto.jpg"], [ascii("MZejecutable"), "image/jpeg", "foto.jpg"],
    [pdf, "image/png", "foto.png"], [jpeg, "application/octet-stream", "foto.jpg"],
  ]) assert.equal(inspect(...input).code, "INVALID_FILE_TYPE");
});

test("comprueba PNG completo, tipo WebP y marca AVIF explícita", () => {
  assert.equal(inspect(bytes(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0), "image/png", "x.png").ok, false);
  assert.equal(inspect(ascii("RIFFxxxxWEBPxxxx"), "image/webp", "x.webp").ok, false);
  const compatible = avif.slice();
  compatible.set(ascii("mif1"), 8);
  assert.equal(inspect(compatible, "image/avif", "x.avif").ok, true);
  compatible.set(ascii("heic"), 20);
  assert.equal(inspect(compatible, "image/avif", "x.avif").ok, false);
  assert.equal(inspect(avif.subarray(0, 12), "image/avif", "x.avif").ok, false);
});

test("rechaza archivo vacío, contenido desconocido y encabezado PDF no inicial", () => {
  assert.equal(inspect(new Uint8Array(), "image/jpeg", "x.jpg").code, "VALIDATION");
  assert.equal(inspect(ascii("desconocido"), "application/pdf", "x.pdf").ok, false);
  assert.equal(inspect(ascii("MZ %PDF-1.7\n"), "application/pdf", "x.pdf").ok, false);
});

test("conserva el límite de 5 MiB y deriva extensión segura si no hay extensión", () => {
  const boundary = new Uint8Array(MEDIA_MAX_BYTES);
  boundary.set(jpeg);
  assert.equal(inspect(boundary, "image/jpeg", "foto").extension, "jpg");
  assert.equal(inspect(jpeg, "image/jpeg", "foto.jpg", MEDIA_MAX_BYTES + 1).code, "FILE_TOO_LARGE");
  assert.equal(inspect(new Uint8Array(MEDIA_MAX_BYTES + 1), "image/jpeg", "foto.jpg").code, "FILE_TOO_LARGE");
});

test("la política existente de portadas mantiene su aceptación de imágenes", () => {
  for (const [data, type, name] of [[jpeg, "image/jpeg", "x.jpg"], [png, "image/png", "x.png"], [webp, "image/webp", "x.webp"], [avif, "image/avif", "x.avif"]]) {
    assert.equal(inspectImageFile({ bytes: data, type, name, size: data.length }).ok, true);
  }
});
