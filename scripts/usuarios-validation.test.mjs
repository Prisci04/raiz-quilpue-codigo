import assert from "node:assert/strict";
import test from "node:test";

import { generatePassword } from "../src/lib/usuarios/generate-password.mjs";
import {
  parseCreateUsuario,
  parseEstadoUsuario,
  parsePasswordChange,
  parsePerfilUpdate,
  parseUpdateUsuario,
  passwordChecks,
  passwordMeetsPolicy,
} from "../src/lib/usuarios/validation.mjs";

const VALID = {
  nombre: " María ",
  apellido: " González ",
  email: " Maria@RaizQuilpue.cl ",
  telefono: " +56 9 1234 5678 ",
  rolCodigo: "editor",
  password: "Clave#Segura12",
  tipo_usuario: "publico",
  password_hash: "no-debe-usarse",
  estado: "inactivo",
  rol_id: 99,
};

test("crear usuario normaliza datos y descarta campos de confianza", () => {
  const parsed = parseCreateUsuario(VALID);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.nombre, "María");
  assert.equal(parsed.value.apellido, "González");
  assert.equal(parsed.value.email, "maria@raizquilpue.cl");
  assert.equal(parsed.value.telefono, "+56 9 1234 5678");
  assert.equal(parsed.value.rolCodigo, "editor");
  assert.equal(parsed.value.password, "Clave#Segura12");
  assert.equal("tipo_usuario" in parsed.value, false);
  assert.equal("password_hash" in parsed.value, false);
  assert.equal("estado" in parsed.value, false);
  assert.equal("rol_id" in parsed.value, false);
});

test("rechaza contraseña débil, rol visual y correo inválido", () => {
  assert.equal(passwordMeetsPolicy("corta"), false);
  assert.equal(parseCreateUsuario({ ...VALID, password: "soloLetras12" }).ok, false);
  assert.equal(parseCreateUsuario({ ...VALID, rolCodigo: "Administrador del portal" }).ok, false);
  assert.equal(parseCreateUsuario({ ...VALID, email: "no-es-correo" }).ok, false);
  assert.equal(parseCreateUsuario({ ...VALID, nombre: "   " }).ok, false);
});

test("editar no exige contraseña", () => {
  const parsed = parseUpdateUsuario({
    nombre: "María",
    apellido: "",
    email: "maria@raizquilpue.cl",
    telefono: "",
    rolCodigo: "administrador",
    password: "NoDebeAplicarse#12",
  });

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.apellido, null);
  assert.equal(parsed.value.telefono, null);
  assert.equal("password" in parsed.value, false);
});

test("estado solo acepta activo o inactivo", () => {
  assert.equal(parseEstadoUsuario({ estado: "activo" }).value, "activo");
  assert.equal(parseEstadoUsuario({ estado: "borrador" }).ok, false);
});

test("perfil solo acepta nombre, apellido y teléfono", () => {
  const parsed = parsePerfilUpdate({
    nombre: " Priscila ",
    apellido: "",
    telefono: " +569 ",
    email: "otro@raizquilpue.cl",
    rol: "editor",
    estado: "inactivo",
    password_hash: "no",
  });

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, {
    nombre: "Priscila",
    apellido: null,
    telefono: "+569",
  });
});

test("cambio de contraseña exige coincidencia y política", () => {
  assert.equal(
    parsePasswordChange({
      passwordActual: "actual",
      passwordNueva: "Nueva#Clave12",
      passwordConfirmacion: "Otra#Clave12",
    }).message,
    "Las nuevas contraseñas no coinciden.",
  );
  assert.equal(
    parsePasswordChange({
      passwordActual: "actual",
      passwordNueva: "debil",
      passwordConfirmacion: "debil",
    }).ok,
    false,
  );
  assert.equal(
    parsePasswordChange({
      passwordActual: "Prueba123!",
      passwordNueva: "Nueva#Clave12",
      passwordConfirmacion: "Nueva#Clave12",
    }).ok,
    true,
  );
});

test("los requisitos se marcan por separado", () => {
  const checks = Object.fromEntries(
    passwordChecks("Abcdefghijkl1!").map((check) => [check.id, check.met]),
  );

  assert.deepEqual(checks, {
    length: true,
    upper: true,
    lower: true,
    digit: true,
    symbol: true,
  });
  assert.equal(passwordChecks("abcdefg").find((check) => check.id === "upper").met, false);
  assert.equal(passwordChecks("ABCDEFGH").find((check) => check.id === "lower").met, false);
  assert.equal(passwordChecks("Abcdefghijkl").find((check) => check.id === "digit").met, false);
  assert.equal(passwordChecks("Abcdefghijk1").find((check) => check.id === "symbol").met, false);
  assert.equal(passwordChecks("Ab1!").find((check) => check.id === "length").met, false);
});

test("la contraseña generada cumple la política", () => {
  for (let index = 0; index < 20; index += 1) {
    const password = generatePassword();
    assert.equal(password.length >= 12 && password.length <= 16, true);
    assert.equal(passwordMeetsPolicy(password), true);
  }
});
