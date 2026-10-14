import assert from "node:assert/strict";
import test from "node:test";

import { parseAporteMuseoInput, parsePiezaMuseoInput } from "../src/lib/community-validation.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

const HOST = "https://proyecto.supabase.co";
const UUID = "550e8400-e29b-41d4-a716-446655440000";
const base = {
  titulo: "Pieza de prueba",
  descripcion: "Descripción de la pieza",
  categoria: "fotografias",
  estado: "borrador",
};

test("acepta portada propia del museo y la imagen de un aporte", () => {
  const portada = parsePiezaMuseoInput({
    ...base,
    imagen_url: `${HOST}/storage/v1/object/public/public-media/museo/4/portada/${UUID}.jpg`,
  });
  assert.equal(portada.ok, true);

  const aporte = parsePiezaMuseoInput({
    ...base,
    imagen_url: `${HOST}/storage/v1/object/public/public-media/museo/aportes/${UUID}.png`,
  });
  assert.equal(aporte.ok, true);
});

test("rechaza Unsplash, /images/ y una URL ajena; la pieza solo acepta archivo subido", () => {
  assert.equal(
    parsePiezaMuseoInput({
      ...base,
      imagen_url: "https://images.unsplash.com/photo-123?auto=format",
    }).ok,
    false,
  );
  assert.equal(parsePiezaMuseoInput({ ...base, imagen_url: "/images/museo/pieza.jpg" }).ok, false);
  assert.equal(parsePiezaMuseoInput({ ...base, imagen_url: "https://evil.example/x.png" }).ok, false);
  assert.equal(parsePiezaMuseoInput({ ...base }).ok, true);
});

test("valida categoría, título y correo del aporte comunitario", () => {
  const ok = parseAporteMuseoInput({
    nombre: "Ana Pérez",
    correo: "Ana.Perez@correo.cl",
    categoria: "fotografias",
    titulo: "Foto de la plaza",
    descripcion: "Una foto antigua",
    archivo_nombre: "plaza.jpg",
  });
  assert.equal(ok.correo, "ana.perez@correo.cl");

  assert.equal(
    parseAporteMuseoInput({
      nombre: "Ana",
      correo: "sin-dominio",
      categoria: "fotografias",
      titulo: "Foto",
      descripcion: "Desc",
      archivo_nombre: "plaza.jpg",
    }),
    null,
  );
});
