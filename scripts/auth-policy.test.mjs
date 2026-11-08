import assert from "node:assert/strict";
import test from "node:test";

import { sessionCookieOptions, sessionTokenFromRequest } from "../src/lib/auth/cookie.mjs";
import {
  parseLoginBody,
  readJsonObject,
  toExactIlikePattern,
} from "../src/lib/auth/credentials.mjs";
import { isTrustedOrigin } from "../src/lib/auth/origin.mjs";
import {
  expirationFrom,
  loginAllowed,
  remainingAbsoluteSeconds,
  sessionAccess,
  sessionStatus,
  shouldTouchActivity,
} from "../src/lib/auth/policy.mjs";
import {
  createSessionValue,
  isSessionTokenShape,
  parseSessionValue,
  passwordFingerprint,
} from "../src/lib/auth/token.mjs";
import { publicUserKeys, toPublicUser } from "../src/lib/auth/user.mjs";
import { ABSOLUTE_MS, IDLE_MS, TOUCH_MS } from "../src/lib/auth/constants.mjs";

process.env.SUPABASE_SECRET_KEY ??= "test-session-secret";

const NOW = Date.parse("2026-10-01T12:00:00.000Z");
const SECRET = process.env.SUPABASE_SECRET_KEY;
const FINGERPRINT = passwordFingerprint("$2b$12$testhash");

function sessionAt(lastOffset, issuedOffset = 0) {
  return {
    issuedAt: NOW + issuedOffset,
    lastActivity: NOW + lastOffset,
    passwordFingerprint: FINGERPRINT,
  };
}

test("la expiración absoluta no se extiende y la inactividad usa 30 minutos", () => {
  const created = expirationFrom(NOW);
  assert.equal(created.getTime(), NOW + ABSOLUTE_MS);
  assert.equal(remainingAbsoluteSeconds(NOW, NOW), ABSOLUTE_MS / 1000);

  assert.equal(sessionStatus(sessionAt(0), NOW), "valid");
  assert.equal(sessionStatus(sessionAt(-IDLE_MS), NOW), "valid");
  assert.equal(sessionStatus(sessionAt(-IDLE_MS - 1), NOW), "idle");
  assert.equal(sessionStatus(sessionAt(0, -ABSOLUTE_MS), NOW), "expired");
  assert.equal(shouldTouchActivity(sessionAt(-TOUCH_MS), NOW), true);
  assert.equal(shouldTouchActivity(sessionAt(-TOUCH_MS + 1), NOW), false);
});

test("el login acepta cualquier usuario existente con contraseña válida", () => {
  const user = { id: 1, email: "ada@raiz.cl" };
  assert.equal(loginAllowed(user, true), true);
  assert.equal(loginAllowed(null, false), false);
  assert.equal(loginAllowed(user, false), false);
  assert.equal(loginAllowed(null, true), false);
});

test("una sesión solo es válida si el usuario sigue existiendo", () => {
  assert.equal(sessionAccess(null), "unauthenticated");
  assert.equal(sessionAccess({ id: 1 }), "ok");
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

test("la cookie firmada no lleva correo ni contraseña y rechaza manipulación", () => {
  const token = createSessionValue(
    {
      userId: 7,
      issuedAt: NOW,
      lastActivity: NOW,
      passwordFingerprint: FINGERPRINT,
    },
    SECRET,
  );
  const parsed = parseSessionValue(token, SECRET);

  assert.equal(isSessionTokenShape(token), true);
  assert.equal(parsed.userId, 7);
  assert.equal(parsed.passwordFingerprint, FINGERPRINT);
  assert.equal(token.includes("ada@raiz.cl"), false);
  assert.equal(token.includes("secreto"), false);
  assert.equal(parseSessionValue("manipulado", SECRET), null);
  assert.equal(parseSessionValue(`${token}extra`, SECRET), null);
  assert.equal(isSessionTokenShape("manipulado"), false);

  const tampered = `${token.slice(0, -2)}aa`;
  assert.equal(parseSessionValue(tampered, SECRET), null);

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
    password: "secreto",
    password_hash: "secreto",
    token_hash: "otro",
  });

  assert.deepEqual(Object.keys(user), publicUserKeys());
  assert.equal(JSON.stringify(user).includes("password"), false);
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

  const sameSiteFetch = new Request("http://localhost:3000/api/admin/actividades/1/participantes/1", {
    method: "DELETE",
    headers: {
      host: "localhost:3000",
      "sec-fetch-site": "same-origin",
    },
  });
  const sameSiteReferer = new Request("http://localhost:3000/api/admin/actividades/1/participantes/1", {
    method: "DELETE",
    headers: {
      host: "localhost:3000",
      referer: "http://localhost:3000/admin/actividades/1/participantes",
    },
  });
  const foreignReferer = new Request("http://localhost:3000/api/admin/actividades/1/participantes/1", {
    method: "DELETE",
    headers: {
      host: "localhost:3000",
      referer: "https://evil.example/admin",
    },
  });

  assert.equal(isTrustedOrigin(sameSiteFetch), true);
  assert.equal(isTrustedOrigin(sameSiteReferer), true);
  assert.equal(isTrustedOrigin(foreignReferer), false);
});

test("la cookie de sesión se lee desde el request de la API", () => {
  const token = createSessionValue(
    {
      userId: 1,
      issuedAt: NOW,
      lastActivity: NOW,
      passwordFingerprint: FINGERPRINT,
    },
    SECRET,
  );
  const fromHeader = new Request("http://localhost:3000/api/admin", {
    headers: { cookie: `theme=brown; rq_session=${token}; other=1` },
  });
  const fromStore = {
    cookies: {
      get(name) {
        return name === "rq_session" ? { value: token } : undefined;
      },
    },
    headers: { get() { return null; } },
  };

  assert.equal(sessionTokenFromRequest(fromHeader), token);
  assert.equal(sessionTokenFromRequest(fromStore), token);
  assert.equal(sessionTokenFromRequest(new Request("http://localhost:3000/api/admin")), null);
});
