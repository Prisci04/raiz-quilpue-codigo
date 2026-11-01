import assert from "node:assert/strict";
import test from "node:test";

import {
  CATALOGO_ACTIVIDAD_NOMBRES,
  findCatalogoById,
  findCatalogoByNombre,
  isCatalogoPublico,
  mapCatalogoRow,
  NOMBRE_COMUNA_DEFAULT,
  NOMBRE_ESTADO_PUBLICADA,
  NOMBRE_REGION_DEFAULT,
  parseCatalogoId,
  parseOptionalCatalogoId,
} from "../src/lib/catalogos.mjs";

const modalidades = [
  { id: 1, nombre: "Presencial" },
  { id: 2, nombre: "Virtual" },
  { id: 3, nombre: "Híbrida" },
];

test("solo expone catálogos públicos por nombre", () => {
  assert.equal(isCatalogoPublico("modalidad"), true);
  assert.equal(isCatalogoPublico("estado_publicacion"), true);
  assert.equal(isCatalogoPublico("estado_inscripcion"), false);
  assert.equal(isCatalogoPublico("estado_revision"), false);
  assert.deepEqual(CATALOGO_ACTIVIDAD_NOMBRES, [
    "modalidad",
    "tipo_participacion",
    "costo_actividad",
    "publico_objetivo",
    "estado_publicacion",
  ]);
});

test("mapea filas de catálogo a id y nombre", () => {
  const mapped = mapCatalogoRow(
    {
      idColumn: "id_comuna",
      nombreColumn: "nombre_comuna",
      extraColumns: ["id_region"],
    },
    { id_comuna: 27, nombre_comuna: "Quilpué", id_region: 6 },
  );

  assert.deepEqual(mapped, {
    id: 27,
    nombre: "Quilpué",
    id_region: 6,
  });
});

test("busca catálogos por id y por nombre oficial", () => {
  assert.equal(findCatalogoById(modalidades, 1).nombre, "Presencial");
  assert.equal(findCatalogoById(modalidades, "3").nombre, "Híbrida");
  assert.equal(findCatalogoById(modalidades, 99), null);
  assert.equal(findCatalogoByNombre(modalidades, "  virtual ").nombre, "Virtual");
  assert.equal(findCatalogoByNombre(modalidades, "presencial").id, 1);
  assert.equal(findCatalogoByNombre(modalidades, ""), null);
});

test("valida IDs de catálogo y permite NULL cuando corresponde", () => {
  assert.deepEqual(parseCatalogoId(2, modalidades, "La modalidad"), {
    ok: true,
    value: 2,
  });
  assert.equal(parseCatalogoId("", modalidades, "La modalidad").ok, false);
  assert.equal(parseCatalogoId(99, modalidades, "La modalidad").ok, false);
  assert.deepEqual(parseOptionalCatalogoId("", modalidades, "El costo"), {
    ok: true,
    value: null,
  });
  assert.equal(parseOptionalCatalogoId(1, modalidades, "El costo").value, 1);
});

test("conserva los nombres sembrados en la base", () => {
  assert.equal(NOMBRE_ESTADO_PUBLICADA, "Publicada");
  assert.equal(NOMBRE_REGION_DEFAULT, "Valparaíso");
  assert.equal(NOMBRE_COMUNA_DEFAULT, "Quilpué");
});
