import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateContenido, parseUpdateContenido } from "../src/lib/contenidos/validation.mjs";
import {
  buildObjectPath,
  inspectImageFile,
  mediaTarget,
  parseOwnedPortadaUrl,
  supabaseProjectHostname,
} from "../src/lib/media/policy.mjs";

const HOST = "https://proyecto.supabase.co";
const PORTADA =
  "https://proyecto.supabase.co/storage/v1/object/public/public-media/contenidos/15/portada/550e8400-e29b-41d4-a716-446655440000.webp";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const avif = Uint8Array.from([
  0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
]);

const doc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hola" }] }],
};
const base = {
  titulo: "Título",
  descripcion: "Tarjeta",
  resumen: "Resumen",
  tipo: "noticia",
  estado: "borrador",
  contenido: doc,
};

test("el hostname es el del proyecto y no un comodín", () => {
  assert.equal(supabaseProjectHostname(HOST), "proyecto.supabase.co");
  assert.equal(supabaseProjectHostname("https://otro.supabase.co.evil.test"), null);
  assert.equal(supabaseProjectHostname("https://supabase.co"), null);
});

test("acepta jpeg, png, webp y avif con firma real", () => {
  assert.equal(inspectImageFile({ bytes: jpeg, type: "image/jpeg", name: "foto final!!!.jpg", size: jpeg.byteLength }).ok, true);
  assert.equal(inspectImageFile({ bytes: png, type: "image/png", name: "a.png", size: png.byteLength }).ok, true);
  assert.equal(inspectImageFile({ bytes: webp, type: "image/webp", name: "a.webp", size: webp.byteLength }).ok, true);
  assert.equal(inspectImageFile({ bytes: avif, type: "image/avif", name: "a.avif", size: avif.byteLength }).ok, true);
});

test("rechaza archivos que no son imagen, vacíos o mayores a 5 MB", () => {
  assert.equal(inspectImageFile({ bytes: jpeg, type: "text/plain", name: "a.jpg", size: jpeg.byteLength }).status, 415);
  assert.equal(inspectImageFile({ bytes: png, type: "image/png", name: "virus.exe", size: png.byteLength }).status, 415);
  assert.equal(inspectImageFile({ bytes: new Uint8Array(), type: "image/png", name: "a.png", size: 0 }).status, 400);
  assert.equal(
    inspectImageFile({ bytes: jpeg, type: "image/jpeg", name: "a.jpg", size: 5 * 1024 * 1024 + 1 }).status,
    413,
  );
});

test("el nombre del usuario no entra en la ruta y el archivo lleva uuid", () => {
  const target = mediaTarget("contenidos", "portada", "15");
  const path = buildObjectPath(target, "jpg");

  assert.match(path, /^contenidos\/15\/portada\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(path.includes("foto"), false);
  assert.equal(mediaTarget("contenidos", "portada", "../15"), null);
  assert.equal(mediaTarget("museo", "fotografia", "1"), null);
});

test("solo acepta la URL pública de la portada de este proyecto", () => {
  const owned = parseOwnedPortadaUrl(PORTADA, HOST);

  assert.equal(owned.registroId, 15);
  assert.equal(owned.bucket, "public-media");
  assert.equal(parseOwnedPortadaUrl("https://otro.supabase.co/storage/v1/object/public/public-media/contenidos/15/portada/550e8400-e29b-41d4-a716-446655440000.webp", HOST), null);
  assert.equal(parseOwnedPortadaUrl("https://proyecto.supabase.co/storage/v1/object/public/public-media/contenidos/15/portada/../../secret.webp", HOST), null);

  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = HOST;
  assert.equal(parseCreateContenido({ ...base, imagen_url: "https://images.unsplash.com/photo.jpg" }).ok, false);
  assert.equal(parseUpdateContenido({ ...base, imagen_url: PORTADA }).ok, true);
  assert.equal(parseUpdateContenido({ ...base, imagen_url: null }).value.imagen_url, null);
  process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
});
