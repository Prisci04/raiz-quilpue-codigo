import assert from "node:assert/strict";
import test from "node:test";

import {
  compareActividades,
  capacidadInscripcion,
  cuposDisponibles,
  esParticipacionInscripcion,
  inscripcionAceptaNuevos,
  inscripcionEnEspera,
  isActividadPasada,
  listaEsperaDisponibles,
  markListaEspera,
} from "../src/lib/actividades.js";
import {
  parseActividadEstado,
  parseActividadInput,
  parseInscripcionInput,
} from "../src/lib/community-validation.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

const CATALOGOS = {
  modalidad: [
    { id: 1, nombre: "Presencial" },
    { id: 2, nombre: "Virtual" },
    { id: 3, nombre: "Híbrida" },
  ],
  tipo_participacion: [
    { id: 1, nombre: "Abierta" },
    { id: 2, nombre: "Inscripción" },
  ],
  costo_actividad: [
    { id: 1, nombre: "Gratuita" },
    { id: 2, nombre: "Pagada" },
    { id: 3, nombre: "Aporte voluntario" },
  ],
  publico_objetivo: [
    { id: 1, nombre: "Todas las edades" },
    { id: 2, nombre: "Mayores de 18 años" },
  ],
  estado_publicacion: [
    { id: 1, nombre: "Borrador" },
    { id: 2, nombre: "Publicada" },
  ],
  lugares: [{ id: 10, nombre: "Centro Cultural Daniel de la Vega" }],
};

const base = {
  titulo: "Prueba",
  descripcion: "Desc",
  fecha: "2099-01-01",
  id_modalidad: 1,
  id_lugar: 10,
  id_publico: 1,
  id_tipo_participacion: 1,
  id_costo: 1,
  id_estado: 1,
};

function parse(input) {
  return parseActividadInput({ ...base, ...input }, CATALOGOS);
}

test("acepta hora HH:MM:SS que viene de la base y la normaliza", () => {
  const parsed = parse({
    hora_inicio: "15:00:00",
    hora_fin: "19:30:00",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.hora_inicio, "15:00");
  assert.equal(parsed.value.hora_fin, "19:30");
});

test("rechaza hora de término anterior o igual a la de inicio", () => {
  const parsed = parse({ hora_inicio: "12:00", hora_fin: "10:00" });
  assert.equal(parsed.ok, false);
  assert.match(parsed.message, /término/i);
});

test("exige un público objetivo válido por ID", () => {
  const missing = parse({ id_publico: "" });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /público objetivo/i);

  const invalid = parse({ id_publico: 99 });
  assert.equal(invalid.ok, false);

  const mayores = parse({ id_publico: 2 });
  assert.equal(mayores.ok, true);
  assert.equal(mayores.value.id_publico, 2);
});

test("exige un lugar para cualquier modalidad", () => {
  const presencial = parse({ id_lugar: "" });
  assert.equal(presencial.ok, false);
  assert.match(presencial.message, /lugar/i);

  const virtual = parse({ id_modalidad: 2, id_lugar: "" });
  assert.equal(virtual.ok, false);

  const hibrida = parse({ id_modalidad: 3, id_lugar: 10 });
  assert.equal(hibrida.ok, true);
  assert.equal(hibrida.value.id_lugar, 10);
});

test("la imagen de la actividad solo acepta un archivo subido", () => {
  const HOST = "https://proyecto.supabase.co";
  const UUID = "550e8400-e29b-41d4-a716-446655440000";
  const portada = parse({
    imagen_url: `${HOST}/storage/v1/object/public/public-media/actividades/4/portada/${UUID}.jpg`,
  });
  assert.equal(portada.ok, true);

  assert.equal(
    parse({
      imagen_url: "https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200",
    }).ok,
    false,
  );
  assert.equal(parse({ imagen_url: "https://i.imgur.com/foto.jpg" }).ok, false);
  assert.equal(parse({ imagen_url: "/images/inicio/imgini5.jpg" }).ok, false);
});

test("exige monto si es pagada y conserva información adicional", () => {
  const withoutAmount = parse({ id_costo: 2 });
  assert.equal(withoutAmount.ok, false);

  const extra = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Llevar agua" }] }],
  };
  const parsed = parse({
    id_costo: 2,
    valor_monto: 5000,
    informacion_adicional: extra,
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.valor_monto, 5000);
  assert.equal(parsed.value.informacion_adicional.type, "doc");
  assert.equal(parsed.value.id_costo, 2);
});

test("el monto pagado solo acepta dígitos", () => {
  const ok = parse({ id_costo: 2, valor_monto: "5000" });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.valor_monto, 5000);

  for (const valor_monto of ["5.000", "5 000", "$5000", "5e3", "+5000", "-1", "12ab", "1.5", " "]) {
    const parsed = parse({ id_costo: 2, valor_monto });
    assert.equal(parsed.ok, false, valor_monto);
    assert.match(parsed.message, /monto/i);
  }
});

test("el cambio de estado solo acepta un estado válido del catálogo", () => {
  assert.equal(parseActividadEstado({ estado: "publicada" }, CATALOGOS.estado_publicacion).ok, true);
  assert.equal(parseActividadEstado({ id_estado: 2 }, CATALOGOS.estado_publicacion).value.id_estado, 2);
  assert.equal(parseActividadEstado({ estado: "archivada" }, CATALOGOS.estado_publicacion).ok, false);
  assert.equal(parseActividadEstado({ estado: "cancelada" }, CATALOGOS.estado_publicacion).ok, false);
});

test("exige cupos al publicar una actividad con inscripción", () => {
  const draft = parse({
    id_tipo_participacion: 2,
    id_estado: 1,
    cupos_max: null,
  });
  assert.equal(draft.ok, true);

  const published = parse({
    id_tipo_participacion: 2,
    id_estado: 2,
    cupos_max: null,
  });
  assert.equal(published.ok, false);
  assert.match(published.message, /cupos/i);
});

test("la inscripción normaliza el correo y arma el celular chileno con +56", () => {
  const ok = parseInscripcionInput({
    nombre: "Ana",
    apellido: "Pérez",
    email: "  ANA@Mail.CL ",
    telefono: "9 1234 5678",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.email, "ana@mail.cl");
  assert.equal(ok.value.telefono, "+56 9 1234 5678");

  const withCountry = parseInscripcionInput({
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@mail.com",
    telefono: "+56912345678",
  });
  assert.equal(withCountry.ok, true);
  assert.equal(withCountry.value.telefono, "+56 9 1234 5678");

  const badEmail = parseInscripcionInput({
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@mail",
    telefono: "912345678",
  });
  assert.equal(badEmail.ok, false);

  const badPhone = parseInscripcionInput({
    nombre: "Ana",
    apellido: "Pérez",
    email: "ana@mail.com",
    telefono: "812345678",
  });
  assert.equal(badPhone.ok, false);
});

test("ordena próximas primero, después sin fecha y las pasadas al final", () => {
  const rows = [
    { id: 1, fecha: "2001-01-01", hora_inicio: "10:00" },
    { id: 2, fecha: null, hora_inicio: null },
    { id: 3, fecha: "2099-01-01", hora_inicio: "09:00" },
  ];
  const sorted = [...rows].sort(compareActividades);
  assert.deepEqual(sorted.map((row) => row.id), [3, 2, 1]);
  assert.equal(isActividadPasada("2001-01-01"), true);
  assert.equal(cuposDisponibles(20, 6), 14);
});

test("la lista de espera usa cupos_espera y no un valor fijo", () => {
  assert.equal(capacidadInscripcion(20), 20);
  assert.equal(capacidadInscripcion(20, 15), 35);
  assert.equal(listaEsperaDisponibles(20, 15, 0), 15);
  assert.equal(listaEsperaDisponibles(20, 15, 1), 14);
  assert.equal(listaEsperaDisponibles(20, 15, 15), 0);
  assert.equal(cuposDisponibles(20, 21), 0);
  // El conteo oficial puede superar cupos_max (p. ej. 35 confirmadas con 20 cupos).
  assert.equal(cuposDisponibles(20, 35), 0);

  const ranked = markListaEspera(
    [
      { id: 2, fecha_creacion: "2026-01-02T12:00:00Z" },
      { id: 1, fecha_creacion: "2026-01-01T12:00:00Z" },
    ],
    1,
  );
  assert.equal(ranked.find((row) => row.id === 1).lista_espera, false);
  assert.equal(ranked.find((row) => row.id === 1).cupo, 1);
  assert.equal(ranked.find((row) => row.id === 2).lista_espera, true);
  assert.equal(ranked.find((row) => row.id === 2).cupo, 2);

  const activity = {
    tipo_participacion: "Inscripción",
    cupos: 20,
    cupos_disponibles: 0,
    cupos_espera: 15,
    lista_espera_disponibles: 15,
  };
  assert.equal(esParticipacionInscripcion(activity.tipo_participacion), true);
  assert.equal(inscripcionAceptaNuevos(activity), true);
  assert.equal(inscripcionEnEspera(activity), true);
  assert.equal(inscripcionAceptaNuevos({ ...activity, lista_espera_disponibles: 0 }), false);
});
