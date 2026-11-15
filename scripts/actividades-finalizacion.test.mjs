import assert from "node:assert/strict";
import test from "node:test";

import {
  esEstadoFinalizada,
  haTerminadoActividad,
  mapActividadVista,
  mostrarComoFinalizada,
  todayISO,
} from "../src/lib/actividades.js";
import { NOMBRE_ESTADO_FINALIZADA } from "../src/lib/catalogos.mjs";

function atSantiago(isoLocal) {
  const [date, time = "12:00:00"] = isoLocal.split("T");
  const probe = new Date(`${date}T${time}.000Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(probe);
  const read = (type) => Number(parts.find((part) => part.type === type).value);
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm, ss);
  return new Date(probe.getTime() + (wanted - asUtc));
}

test("la persistencia a Finalizada usa el día siguiente (fecha < hoy Chile)", () => {
  const ahora = atSantiago("2026-12-16T10:00:00");
  assert.equal(todayISO(ahora), "2026-12-16");
  // El 15/12 a las 15:00 sigue Publicada ese día; al día siguiente ya corresponde finalizar.
  assert.equal("2026-12-15" < todayISO(ahora), true);
  assert.equal("2026-12-16" < todayISO(ahora), false);
});

test("conteo oficial = Confirmada (puede superar cupos_max); espera no suma", () => {
  const vista = mapActividadVista({
    id_actividad: 9,
    fecha: "2099-01-01",
    cupos_max: 20,
    cupos_espera: 10,
    inscritos: 35,
    inscritos_espera: 4,
    estado_publicacion: { nombre_estado: "Publicada" },
  });
  assert.equal(vista.inscritos, 35);
  assert.equal(vista.inscritos_espera, 4);
  assert.equal(vista.cupos_disponibles, 0);
  assert.equal(vista.lista_espera_disponibles, 6);
});

test("haTerminadoActividad sigue cerrando inscripciones con fecha + hora_fin", () => {
  const now = atSantiago("2026-12-15T15:30:00");
  assert.equal(haTerminadoActividad("2026-12-15", "15:00:00", now), true);
  assert.equal(haTerminadoActividad("2026-12-15", "16:00:00", now), false);
  assert.equal(haTerminadoActividad("2026-12-15", "15:00:00", atSantiago("2026-12-15T14:59:00")), false);
});

test("mapActividadVista marca pasada con hora_fin o estado Finalizada", () => {
  assert.equal(
    mapActividadVista({
      id_actividad: 1,
      fecha: "2001-01-01",
      hora_fin: "12:00:00",
      estado_publicacion: { nombre_estado: "Publicada" },
    }).pasada,
    true,
  );

  const finalizada = mapActividadVista({
    id_actividad: 2,
    fecha: "2099-01-01",
    hora_fin: "23:00:00",
    estado_publicacion: { nombre_estado: NOMBRE_ESTADO_FINALIZADA },
  });
  assert.equal(finalizada.pasada, true);
  assert.equal(esEstadoFinalizada(finalizada.estado), true);
  assert.equal(mostrarComoFinalizada(finalizada.estado, finalizada.pasada), true);
});
