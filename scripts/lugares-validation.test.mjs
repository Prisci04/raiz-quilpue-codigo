import assert from "node:assert/strict";
import test from "node:test";

import { parseLugarInput } from "../src/lib/lugares/validation.mjs";

const VALID = {
  nombre_lugar: " Centro Cultural Daniel de la Vega ",
  direccion: "  Prat 1234 ",
  id_comuna: 27,
  google_place_id: " ChIJabc ",
  latitud: -33.047,
  longitud: -71.443,
};

test("normaliza un lugar válido", () => {
  const parsed = parseLugarInput(VALID);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.nombre_lugar, "Centro Cultural Daniel de la Vega");
  assert.equal(parsed.value.direccion, "Prat 1234");
  assert.equal(parsed.value.id_comuna, 27);
  assert.equal(parsed.value.google_place_id, "ChIJabc");
});

test("exige nombre, dirección y comuna", () => {
  assert.equal(parseLugarInput({ ...VALID, nombre_lugar: "  " }).ok, false);
  assert.equal(parseLugarInput({ ...VALID, direccion: "" }).ok, false);
  assert.equal(parseLugarInput({ ...VALID, id_comuna: 0 }).ok, false);
});

test("valida coordenadas y acepta ausencias", () => {
  assert.equal(parseLugarInput({ ...VALID, latitud: -91 }).ok, false);
  assert.equal(parseLugarInput({ ...VALID, longitud: 181 }).ok, false);
  const empty = parseLugarInput({
    nombre: "Plaza",
    direccion: "Centro",
    id_comuna: 1,
  });
  assert.equal(empty.ok, true);
  assert.equal(empty.value.latitud, null);
  assert.equal(empty.value.longitud, null);
  assert.equal(empty.value.google_place_id, null);
});
