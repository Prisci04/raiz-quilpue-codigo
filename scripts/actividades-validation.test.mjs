import assert from "node:assert/strict";
import test from "node:test";

import { compareActividades, cuposDisponibles, isActividadPasada } from "../src/lib/actividades.js";
import {
  parseActividadEstado,
  parseActividadInput,
  parseInscripcionInput,
} from "../src/lib/community-validation.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";

const base = {
  titulo: "Prueba",
  descripcion: "Desc",
  modalidad: "presencial",
  tipo_participacion: "abierta",
  tipo_valor: "gratuito",
  estado: "borrador",
};

test("acepta hora HH:MM:SS que viene de la base y la normaliza", () => {
  const parsed = parseActividadInput({
    ...base,
    hora_inicio: "15:00:00",
    hora_fin: "19:30:00",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.hora_inicio, "15:00");
  assert.equal(parsed.value.hora_fin, "19:30");
});

test("rechaza hora de término anterior o igual a la de inicio", () => {
  const parsed = parseActividadInput({ ...base, hora_inicio: "12:00", hora_fin: "10:00" });
  assert.equal(parsed.ok, false);
  assert.match(parsed.message, /término/i);
});

test("acepta Unsplash con query y rechaza traversal en /images/", () => {
  const unsplash = parseActividadInput({
    ...base,
    imagen_url: "https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200",
  });
  assert.equal(unsplash.ok, true);

  const traversal = parseActividadInput({ ...base, imagen_url: "/images/../../secret.png" });
  assert.equal(traversal.ok, false);
});

test("exige monto si es pagada y conserva forma_pago e información adicional", () => {
  const withoutAmount = parseActividadInput({ ...base, tipo_valor: "pagado" });
  assert.equal(withoutAmount.ok, false);

  const extra = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Llevar agua" }] }],
  };
  const parsed = parseActividadInput({
    ...base,
    tipo_valor: "pagado",
    valor_monto: 5000,
    forma_pago: "Transferencia",
    informacion_adicional: extra,
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.forma_pago, "Transferencia");
  assert.equal(parsed.value.informacion_adicional.type, "doc");
});

test("el cambio de estado solo acepta un estado válido", () => {
  assert.equal(parseActividadEstado({ estado: "publicada" }).ok, true);
  assert.equal(parseActividadEstado({ estado: "archivada" }).ok, false);
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
