import assert from "node:assert/strict";
import test from "node:test";

import { parseAporteMuseoInput, parsePiezaMuseoInput } from "../src/lib/community-validation.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

const HOST = "https://proyecto.supabase.co";
const UUID = "550e8400-e29b-41d4-a716-446655440000";
const catalogos = {
  categoria_museo: [
    { id: 1, nombre: "Fotografías" },
    { id: 2, nombre: "Documentos" },
  ],
};
const portadaUrl = `${HOST}/storage/v1/object/public/public-media/museo/4/portada/${UUID}.jpg`;
const aporteUrl = `${HOST}/storage/v1/object/public/public-media/museo/aportes/${UUID}.png`;
const base = {
  titulo: "Pieza de prueba",
  descripcion: "Descripción de la pieza",
  id_categoria_museo: 1,
  imagen_url: portadaUrl,
};

test("acepta portada propia del museo y la imagen de un aporte", () => {
  const portada = parsePiezaMuseoInput({ ...base }, catalogos);
  assert.equal(portada.ok, true);
  assert.equal(portada.value.id_categoria_museo, 1);

  const aporte = parsePiezaMuseoInput({ ...base, imagen_url: aporteUrl }, catalogos);
  assert.equal(aporte.ok, true);
});

test("exige imagen propia y rechaza Unsplash, /images/ o una URL ajena", () => {
  assert.equal(parsePiezaMuseoInput({ ...base, imagen_url: "" }, catalogos).ok, false);
  assert.equal(
    parsePiezaMuseoInput({
      ...base,
      imagen_url: "https://images.unsplash.com/photo-123?auto=format",
    }, catalogos).ok,
    false,
  );
  assert.equal(parsePiezaMuseoInput({ ...base, imagen_url: "/images/museo/pieza.jpg" }, catalogos).ok, false);
  assert.equal(parsePiezaMuseoInput({ ...base, imagen_url: "https://evil.example/x.png" }, catalogos).ok, false);
  assert.equal(parsePiezaMuseoInput({ ...base, id_categoria_museo: 99 }, catalogos).ok, false);
});

test("valida categoría, título, correo, apellido e imagen opcional del aporte", () => {
  const ok = parseAporteMuseoInput({
    nombre: "Ana",
    apellido: "Pérez",
    correo: "Ana.Perez@correo.cl",
    id_categoria_museo: 1,
    titulo: "Foto de la plaza",
    descripcion: "Una foto antigua",
    imagen_url: aporteUrl,
  }, catalogos);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.correo_aportante, "ana.perez@correo.cl");
  assert.equal(ok.value.nombre_aportante, "Ana");
  assert.equal(ok.value.apellido_aportante, "Pérez");
  assert.equal(ok.value.id_categoria_museo, 1);

  const sinImagen = parseAporteMuseoInput({
    nombre: "Ana",
    apellido: "Pérez",
    correo: "ana@correo.cl",
    id_categoria_museo: 1,
    titulo: "Relato sin foto",
    descripcion: "Solo texto",
    imagen_url: null,
  }, catalogos);
  assert.equal(sinImagen.ok, true);
  assert.equal(sinImagen.value.imagen_url, null);

  // Aportes nuevos: apellido obligatorio (los antiguos en BD pueden ser NULL).
  assert.equal(
    parseAporteMuseoInput({
      nombre: "Ana",
      correo: "ana@correo.cl",
      id_categoria_museo: 1,
      titulo: "Foto",
      descripcion: "Desc",
      imagen_url: aporteUrl,
    }, catalogos).ok,
    false,
  );

  assert.equal(
    parseAporteMuseoInput({
      nombre: "Ana",
      apellido: "Pérez",
      correo: "sin-dominio",
      id_categoria_museo: 1,
      titulo: "Foto",
      descripcion: "Desc",
      imagen_url: aporteUrl,
    }, catalogos).ok,
    false,
  );
  assert.equal(
    parseAporteMuseoInput({
      nombre: "Ana",
      apellido: "Pérez",
      correo: "ana@correo.cl",
      id_categoria_museo: 1,
      titulo: "Foto",
      descripcion: "Desc",
      imagen_url: portadaUrl,
    }, catalogos).ok,
    false,
  );
});
