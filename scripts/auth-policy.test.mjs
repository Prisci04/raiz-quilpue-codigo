import assert from "node:assert/strict";
import test from "node:test";

import { sessionCookieOptions } from "../src/lib/auth/cookie.mjs";
import {
  parseLoginBody,
  readJsonObject,
  toExactIlikePattern,
} from "../src/lib/auth/credentials.mjs";
import { isTrustedOrigin } from "../src/lib/auth/origin.mjs";
import {
  expirationFrom,
  loginAllowed,
  sessionAccess,
  sessionStatus,
  shouldTouchActivity,
} from "../src/lib/auth/policy.mjs";
import {
  generateSessionToken,
  hashSessionToken,
  isSessionTokenShape,
} from "../src/lib/auth/token.mjs";
import { publicUserKeys, toPublicUser } from "../src/lib/auth/user.mjs";
import { ABSOLUTE_MS, IDLE_MS, TOUCH_MS } from "../src/lib/auth/constants.mjs";

const NOW = Date.parse("2026-10-01T12:00:00.000Z");

function sessionAt(lastOffset, expiresOffset) {
  return {
    ultima_actividad: new Date(NOW + lastOffset).toISOString(),
    fecha_expiracion: new Date(NOW + expiresOffset).toISOString(),
  };
}

test("la expiración absoluta no se extiende y la inactividad usa 30 minutos", () => {
  const created = expirationFrom(NOW);
  assert.equal(created.getTime(), NOW + ABSOLUTE_MS);

  assert.equal(sessionStatus(sessionAt(0, ABSOLUTE_MS), NOW), "valid");
  assert.equal(sessionStatus(sessionAt(-IDLE_MS, ABSOLUTE_MS), NOW), "valid");
  assert.equal(
    sessionStatus(sessionAt(-IDLE_MS - 1, ABSOLUTE_MS), NOW),
    "idle",
  );
  assert.equal(sessionStatus(sessionAt(0, 0), NOW), "expired");
  assert.equal(sessionStatus(sessionAt(-60_000, 1), NOW + 1), "expired");
  assert.equal(shouldTouchActivity(sessionAt(-TOUCH_MS, ABSOLUTE_MS), NOW), true);
  assert.equal(
    shouldTouchActivity(sessionAt(-TOUCH_MS + 1, ABSOLUTE_MS), NOW),
    false,
  );
});

test("el login solo acepta interno activo con contraseña válida", () => {
  const base = { estado: "activo", tipo_usuario: "interno" };
  assert.equal(loginAllowed(base, true), true);
  assert.equal(loginAllowed(null, false), false);
  assert.equal(loginAllowed(base, false), false);
  assert.equal(loginAllowed({ ...base, estado: "inactivo" }, true), false);
  assert.equal(loginAllowed({ ...base, tipo_usuario: "publico" }, true), false);
});

test("una sesión activa de usuario público no se trata como anónima", () => {
  assert.equal(sessionAccess(null), "unauthenticated");
  assert.equal(
    sessionAccess({ estado: "inactivo", tipo_usuario: "interno" }),
    "unauthenticated",
  );
  assert.equal(
    sessionAccess({ estado: "activo", tipo_usuario: "publico" }),
    "forbidden",
  );
  assert.equal(
    sessionAccess({ estado: "activo", tipo_usuario: "interno" }),
    "ok",
  );
});

test("el cuerpo del login ignora campos de rol y no altera la contraseña", async () => {
  const request = new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "  Admin@Raiz.CL ",
      password: "  secreta  ",
      tipo_usuario: "interno",
      estado: "activo",
      usuario_id: "1",
    }),
  });
  const body = await readJsonObject(request);
  const parsed = parseLoginBody(body.value);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.email, "admin@raiz.cl");
  assert.equal(parsed.password, "  secreta  ");
  assert.deepEqual(Object.keys(parsed), ["ok", "email", "password"]);
});

test("rechaza JSON inválido, vacío, tipos incorrectos e inputs largos", async () => {
  const invalidJson = new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: "{",
  });
  assert.equal((await readJsonObject(invalidJson)).ok, false);
  assert.equal(
    (await readJsonObject(new Request("http://localhost", { method: "POST", body: "" }))).ok,
    false,
  );
  assert.equal(parseLoginBody({ email: "a@b.cl" }).ok, false);
  assert.equal(parseLoginBody({ email: "a@b.cl", password: 1 }).ok, false);
  assert.equal(
    parseLoginBody({ email: `${"a".repeat(250)}@b.cl`, password: "x" }).ok,
    false,
  );
  assert.equal(
    parseLoginBody({ email: "a@b.cl", password: "x".repeat(129) }).ok,
    false,
  );
  assert.equal(parseLoginBody({ email: "' OR 1=1 --", password: "x" }).ok, false);
  assert.equal(
    parseLoginBody({
      email: "<script>alert(1)</script>@x.cl",
      password: "x",
    }).ok,
    false,
  );
});

test("el patrón ilike no interpreta comodines", () => {
  assert.equal(toExactIlikePattern("a_b%c\\d"), "a\\_b\\%c\\\\d");
});

test("el token no se guarda en claro y la cookie no lleva datos de usuario", () => {
  const token = generateSessionToken();
  const other = generateSessionToken();
  const hash = hashSessionToken(token);

  assert.equal(isSessionTokenShape(token), true);
  assert.notEqual(token, other);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(isSessionTokenShape("manipulado"), false);
  assert.equal(isSessionTokenShape(`${token}extra`), false);

  const cookie = sessionCookieOptions("production");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.equal(cookie.maxAge, 8 * 60 * 60);
  assert.equal(sessionCookieOptions("development").secure, false);
  assert.equal("email" in cookie, false);
  assert.equal("password" in cookie, false);
});

test("el usuario público no incluye hash ni token", () => {
  const user = toPublicUser({
    id: "1",
    nombre: "Ada",
    apellido: "Lovelace",
    email: "ada@raiz.cl",
    tipo_usuario: "interno",
    password_hash: "secreto",
    token_hash: "otro",
  });

  assert.deepEqual(Object.keys(user), publicUserKeys());
  assert.equal(JSON.stringify(user).includes("password_hash"), false);
  assert.equal(JSON.stringify(user).includes("token_hash"), false);
  assert.equal(JSON.stringify(user).includes("secreto"), false);
});

test("el origen debe coincidir con el host", () => {
  const allowed = new Request("http://localhost:3000/api/auth/login", {
    headers: { origin: "http://localhost:3000", host: "localhost:3000" },
  });
  const foreign = new Request("http://localhost:3000/api/auth/login", {
    headers: { origin: "https://evil.example", host: "localhost:3000" },
  });
  const missing = new Request("http://localhost:3000/api/auth/login", {
    headers: { host: "localhost:3000" },
  });

  assert.equal(isTrustedOrigin(allowed), true);
  assert.equal(isTrustedOrigin(foreign), false);
  assert.equal(isTrustedOrigin(missing), false);
});
