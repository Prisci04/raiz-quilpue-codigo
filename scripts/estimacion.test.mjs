import assert from "node:assert/strict";
import test from "node:test";

import {
  VARIABLES_ESTIMACION,
  cuposEsperaDesdeFormulario,
  cuposMaxDesdeFormulario,
  estimacionListaParaCalcular,
  parseCuposEspera,
  parseCuposMax,
  parseEstimacionPayload,
} from "../src/lib/ml/estimacion.mjs";

test("esquema de estimación incluye las siete entradas del modelo", () => {
  assert.deepEqual(VARIABLES_ESTIMACION, [
    "fecha",
    "hora_inicio",
    "cupos_max",
    "id_modalidad",
    "id_publico",
    "id_costo",
  ]);
});

test("cupos_max vacío o ausente se envía como null (no como 0)", () => {
  assert.deepEqual(parseCuposMax(null), { ok: true, value: null });
  assert.deepEqual(parseCuposMax(""), { ok: true, value: null });
  assert.equal(cuposMaxDesdeFormulario({ cupos: "" }), null);
});

test("cupos_espera vacío es 0; valores >= 0", () => {
  assert.deepEqual(parseCuposEspera(null), { ok: true, value: 0 });
  assert.deepEqual(parseCuposEspera(""), { ok: true, value: 0 });
  assert.deepEqual(parseCuposEspera(5), { ok: true, value: 5 });
  assert.equal(parseCuposEspera(-1).ok, false);
  assert.equal(cuposEsperaDesdeFormulario({ cupos_espera: "5" }), 5);
  assert.equal(cuposEsperaDesdeFormulario({ cupos_espera: "" }), 0);
});

test("parseEstimacionPayload incluye cupos_max y cupos_espera para el techo", () => {
  const ok = parseEstimacionPayload({
    fecha: "2026-08-20",
    hora_inicio: "18:00",
    cupos_max: 10,
    cupos_espera: 5,
    id_modalidad: 1,
    id_publico: 2,
    id_costo: 1,
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, {
    fecha: "2026-08-20",
    hora_inicio: "18:00:00",
    cupos_max: 10,
    cupos_espera: 5,
    id_modalidad: 1,
    id_publico: 2,
    id_costo: 1,
  });
});

test("estimacionListaParaCalcular usa form.cupos y form.cupos_espera", () => {
  const base = {
    fecha: "2026-08-20",
    hora_inicio: "18:00",
    id_modalidad: 1,
    id_publico: 1,
    id_costo: 1,
    cupos: "10",
    cupos_espera: "5",
  };
  assert.equal(estimacionListaParaCalcular(base), true);
  assert.equal(estimacionListaParaCalcular({ ...base, cupos: "0" }), false);
  assert.equal(estimacionListaParaCalcular({ ...base, cupos_espera: "-1" }), false);
});
