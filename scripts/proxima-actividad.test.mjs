import assert from "node:assert/strict";
import test from "node:test";
import { getProximaActividad } from "../src/lib/proxima-actividad.mjs";

const now = new Date("2026-10-23T15:00:00Z"); // 12:00 en Santiago.
const activity = (id, fecha, hora_inicio = null) => ({ id, fecha, hora_inicio });

test("elige la futura más cercana aunque la colección esté desordenada", () => {
  const list = Object.freeze([
    Object.freeze(activity(1, "2026-10-30")), Object.freeze(activity(2, "2026-10-22")),
    Object.freeze(activity(3, "2026-10-24", "17:00:00")), Object.freeze(activity(4, "2026-10-24", "09:00")),
  ]);
  assert.equal(getProximaActividad(list, now).id, 4);
  assert.equal(getProximaActividad([...list].reverse(), now).id, 4);
  assert.deepEqual(list.map((item) => item.id), [1, 2, 3, 4]);
});

test("hoy admite inicio igual o posterior y excluye los que ya comenzaron", () => {
  assert.equal(getProximaActividad([activity(1, "2026-10-23", "11:59"), activity(2, "2026-10-23", "13:00"), activity(3, "2026-10-23", "12:00:00")], now).id, 3);
  assert.equal(getProximaActividad([activity(1, "2026-10-23", "11:59")], now), null);
  assert.equal(getProximaActividad([activity(1, "2026-10-23")], now).id, 1);
});

test("descarta fechas ausentes, inexistentes, formato inválido y horas inválidas", () => {
  const list = [activity(1, null), activity(2, ""), activity(3, "2026-02-30"), activity(4, "2026-13-01"), activity(5, "no-fecha"), activity(6, "2026-10-24", "25:00")];
  assert.equal(getProximaActividad(list, now), null);
  assert.equal(getProximaActividad([], now), null);
  assert.equal(getProximaActividad([activity(1, "2026-10-22")], now), null);
});

test("usa el día chileno cuando UTC ya corresponde al día siguiente", () => {
  assert.equal(getProximaActividad([activity(1, "2026-10-22", "23:45")], new Date("2026-10-23T02:30:00Z")).id, 1);
  assert.equal(getProximaActividad([activity(1, "2026-07-09", "23:45")], new Date("2026-07-10T03:30:00Z")).id, 1);
});

test("reconoce fecha bisiesta válida", () => {
  assert.equal(getProximaActividad([activity(1, "2028-02-29")], now).id, 1);
  assert.equal(getProximaActividad([activity(1, "2027-02-29")], now), null);
});
