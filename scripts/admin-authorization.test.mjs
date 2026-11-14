import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  createSessionValue,
  passwordFingerprint,
} from "../src/lib/auth/token.mjs";

// Execute the real server modules, replacing only framework I/O and repositories.
// Node >= 22.15 supports synchronous module hooks; no HTTP server or database needed.
process.env.SUPABASE_SECRET_KEY ??= "test-session-secret";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const swc = require("next/dist/build/swc");
await swc.loadBindings();
globalThis.fetch = async () => { throw new Error("Network disabled in authorization tests"); };

const TEST_PASSWORD = "$2b$12$testhash";
const TEST_PV = passwordFingerprint(TEST_PASSWORD);

function signedToken(userId = 1) {
  const now = Date.now();
  return createSessionValue({
    userId,
    issuedAt: now,
    lastActivity: now,
    passwordFingerprint: TEST_PV,
  });
}

const state = globalThis.__rqSecurityTest = {};
const activeUser = {
  id: 1,
  nombre: "Test",
  apellido: "Admin",
  email: "admin@example.com",
  password: TEST_PASSWORD,
};
const role = (codigo) => {
  const nombres = { administrador: "Administrador", editor: "Editor" };
  return {
    codigo,
    nombre: nombres[codigo] ?? codigo,
    nombre_rol: nombres[codigo] ?? codigo,
  };
};
function reset({ user = activeUser, roles = [], token, session = true, readonlyCookies = false } = {}) {
  Object.assign(state, {
    user,
    roles,
    token: token === undefined ? signedToken(user?.id ?? 1) : token,
    session,
    readonlyCookies,
    error: null,
    calls: [],
    queries: [],
    bodyReads: 0,
  });
}

function query(table) {
  const filters = [];
  const record = { table, filters, single: false };
  state.queries.push(record);
  const chain = {
    select() { return chain; },
    eq(key, value) { filters.push([key, value]); return chain; },
    ilike(key, value) { filters.push([key, value]); return chain; },
    order() { return chain; },
    limit() { return chain; },
    maybeSingle() { record.single = true; return chain; },
    then(onValue, onError) {
      let data = [];
      if (table === "usuarios") {
        if (state.users) {
          data = state.users;
        } else if (state.user) {
          data = [{
            id_user: state.user.id,
            nombre_user: state.user.nombre,
            apellido_user: state.user.apellido,
            correo_user: state.user.email,
            telefono: null,
            fec_creacion: "2026-01-01",
            roles: state.roles[0]
              ? { nombre_rol: state.roles[0].nombre_rol }
              : null,
          }];
        }
        for (const [key, value] of filters) {
          if (key === "id_user" || key === "id") {
            data = data.filter((entry) => Number(entry.id_user) === Number(value));
          } else if (key === "roles.nombre_rol") {
            data = data.filter((entry) => {
              const nombre = Array.isArray(entry.roles)
                ? entry.roles[0]?.nombre_rol
                : entry.roles?.nombre_rol;
              return nombre === value;
            });
          } else {
            data = data.filter((entry) => entry[key] === value);
          }
        }
      } else if (table === "roles") {
        data = state.roles.map((entry) => ({
          id_rol: entry.id_rol ?? 1,
          nombre_rol: entry.nombre_rol,
        }));
      } else {
        throw new Error(`Unexpected table: ${table}`);
      }
      return Promise.resolve({
        data: record.single ? data[0] ?? null : data,
        error: state.error,
      }).then(onValue, onError);
    },
  };
  return chain;
}
state.query = query;
state.load = (name) => {
  state.calls.push(name);
  if (name.startsWith("list")) return [];
  if (name.startsWith("count")) return 0;
  return { id: 1, titulo: "Test", estado: "borrador", estado_revision: "Aprobado" };
};

const mocks = new Map([
  ["server-only", "export {};"],
  ["next/link", "export default function Link() { return null; }"],
  ["next/cache", "export function revalidatePath(path) { (globalThis.__rqRevalidated ??= []).push(path); }"],
  ["next/headers", `export async function cookies() {
    const s = globalThis.__rqSecurityTest;
    return {
      get() { return { value: s.token }; },
      set() {
        if (!s.readonlyCookies) return;
        const error = new Error("Cookies can only be modified in a Server Action or Route Handler.");
        error.__NEXT_ERROR_CODE = "E1180";
        throw error;
      },
    };
  }`],
  ["next/navigation", `export function redirect(location) { throw Object.assign(new Error('redirect'), { location }); } export function notFound() { throw new Error('notFound'); }`],
  ["@/lib/supabase/admin", `export function getSupabaseAdminClient() { return { from: globalThis.__rqSecurityTest.query }; }`],
  ["@/services/auth.service", `
    const s = globalThis.__rqSecurityTest;
    export async function findUsuarioById(id) {
      if (!s.session || !s.user) return null;
      if (Number(s.user.id) !== Number(id)) return null;
      return s.user;
    }
    export async function findUsuarioByEmail() { return s.user; }
  `],
]);

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (mocks.has(specifier)) return { url: `security-mock:${specifier}`, shortCircuit: true };
    if (specifier.startsWith("@/components/")) return { url: "security-component:stub", shortCircuit: true };
    if (specifier.startsWith("@/services/") && specifier !== "@/services/usuarios.service") {
      return { url: `security-service:${specifier}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      const base = resolve(root, "src", specifier.slice(2));
      const path = [base, `${base}.js`, `${base}.mjs`, `${base}.jsx`].find(existsSync);
      if (!path) throw new Error(`Unresolved test import: ${specifier}`);
      return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      const path = [`${base}.js`, `${base}.mjs`, `${base}.jsx`].find(existsSync);
      if (path) return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("security-mock:")) return { format: "module", source: mocks.get(url.slice(14)), shortCircuit: true };
    if (url.startsWith("security-component:")) return { format: "module", source: "export default function Component() { return null; } export const AdminBarChart = Component, AdminDonutChart = Component, AdminLineChart = Component;", shortCircuit: true };
    if (url.startsWith("security-service:")) {
      const path = resolve(root, "src", url.slice("security-service:@/".length) + ".js");
      const names = [...readFileSync(path, "utf8").matchAll(/export (?:async )?function (\w+)/g)].map((match) => match[1]);
      return { format: "module", source: names.map((name) => `export async function ${name}() { return globalThis.__rqSecurityTest.load('${name}'); }`).join("\n"), shortCircuit: true };
    }
    if (url.startsWith("file:") && url.endsWith(".jsx")) {
      const source = swc.transformSync(readFileSync(fileURLToPath(url), "utf8"), {
        jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
        module: { type: "es6" },
      }).code;
      return { format: "module", source, shortCircuit: true };
    }
    return next(url, context);
  },
});

const guards = await import("../src/lib/auth/guard.js");
const users = await import("../src/services/usuarios.service.js");
const { validateSession } = await import("../src/lib/auth/session.js");

function request(method = "GET") {
  const req = new Request("http://localhost/api/admin", { method, headers: { origin: "http://localhost", host: "localhost" } });
  req.text = async () => { state.bodyReads++; return "{"; };
  req.formData = async () => { state.bodyReads++; throw new Error("Unexpected body read"); };
  return req;
}
function assertNoBusinessAccess() {
  assert.deepEqual(state.calls, []);
  assert.equal(state.bodyReads, 0);
  const allowed = new Set(["usuarios", "roles"]);
  assert.equal(state.queries.some(({ table }) => !allowed.has(table)), false);
}

test("usuarioTieneRol exige el rol de catálogo asociado al usuario", async () => {
  for (const [roles, expected] of [
    [[], false],
    [[role("editor")], false],
    [[role("administrador")], true],
    [[role("otro")], false],
  ]) {
    reset({ roles });
    assert.equal(await users.usuarioTieneRol(1, "administrador"), expected);
    assert.equal(await users.usuarioTieneRol(2, "administrador"), false);
  }
});

test("el listado de usuarios mapea el rol directo desde la tabla roles", async () => {
  reset();
  state.users = [{
    id_user: 1,
    nombre_user: "Test",
    apellido_user: "Admin",
    correo_user: "admin@example.com",
    telefono: null,
    fec_creacion: "2026-01-01",
    roles: { nombre_rol: "Editor" },
  }];
  const result = await users.listUsuariosInternos();
  assert.deepEqual(result.usuarios[0].roles, [{ codigo: "editor", nombre: "Editor" }]);
  delete state.users;
});

test("un usuario inexistente invalida la sesión", async () => {
  reset({ session: false, roles: [role("administrador")] });
  assert.equal(await validateSession(), null);
  reset({ roles: [role("administrador")] });
  assert.equal((await validateSession()).user.id, 1);
  assert.equal((await guards.requireAdministrador(request())).response, null);
});

test("una página no revienta si Next impide borrar una cookie inválida", async () => {
  reset({ session: false, readonlyCookies: true, roles: [role("administrador")] });
  assert.equal(await validateSession(), null);
});

test("active administrator/editor are allowed, unrelated role and database failures fail closed", async () => {
  for (const codigo of ["administrador", "editor"]) {
    reset({ roles: [role(codigo)] });
    assert.equal((await guards.requireGestorContenido(request())).response, null);
    assert.equal((await guards.requireAdministrador(request())).response?.status ?? 200, codigo === "administrador" ? 200 : 403);
  }
  reset({ roles: [role("otro")] });
  assert.equal((await guards.requireGestorContenido(request())).response.status, 403);
  state.error = { code: "QUERY_FAILED" };
  await assert.rejects(() => guards.requireGestorContenido(request()), /Usuario query failed/);
  assertNoBusinessAccess();
});

function filesUnder(dir, filename) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? filesUnder(join(dir, entry.name), filename) : entry.name === filename ? [join(dir, entry.name)] : []);
}

// Every administrative handler is invoked directly, including mutation methods.
const scenarios = [
  ["sin cookie", { token: null }, 401],
  ["cookie manipulada", { token: "invalid" }, 401],
  ["sesion inexistente", { session: false }, 401],
  ["sin rol", {}, 403],
  ["rol ajeno", { roles: [role("otro")] }, 403],
];
for (const path of filesUnder(join(root, "src/app/api/admin"), "route.js")) {
  const route = await import(pathToFileURL(path));
  const relative = path.slice(root.length).replaceAll("\\", "/");
  const sessionOnly = relative === "src/app/api/admin/route.js" || relative.includes("/perfil/");
  const adminOnly = relative.includes("/usuarios/");
  for (const method of ["GET", "POST", "PATCH", "DELETE"].filter((key) => typeof route[key] === "function")) {
    for (const [label, options, status] of scenarios) {
      if (sessionOnly && status === 403 && !options.user) continue;
      test(`${method} ${relative}: ${label} denies before body/data access`, async () => {
        reset(options);
        const response = await route[method](request(method), { params: Promise.resolve({ id: "1", inscripcionId: "1" }) });
        assert.equal(response.status, status);
        assert.equal(response.headers.get("Cache-Control"), "no-store");
        assertNoBusinessAccess();
      });
    }
    if (adminOnly) test(`${method} ${relative}: active editor cannot administer users`, async () => {
      reset({ roles: [role("editor")] });
      const response = await route[method](request(method), { params: Promise.resolve({ id: "1" }) });
      assert.equal(response.status, 403);
      assertNoBusinessAccess();
    });
  }
}

for (const path of filesUnder(join(root, "src/app/admin/(panel)"), "page.jsx")) {
  const page = (await import(pathToFileURL(path))).default;
  const relative = path.slice(root.length).replaceAll("\\", "/");
  const sessionOnly = /\/(perfil|market)\/page.jsx$/.test(relative);
  const adminOnly = /\/(configuracion|estadisticas)\/page.jsx$/.test(relative);
  for (const [label, options] of scenarios) {
    if (sessionOnly && !options.user && !Object.hasOwn(options, "token") && options.session !== false) continue;
    test(`URL ${relative}: ${label} redirects before rendering/data access`, async () => {
      reset(options);
      await assert.rejects(() => page({ params: Promise.resolve({ id: "1" }), searchParams: Promise.resolve({}) }), (error) => {
        assert.ok(["/admin/login", "/admin/perfil", "/admin"].includes(error.location));
        return true;
      });
      assertNoBusinessAccess();
    });
  }
  test(`URL ${relative}: permitted active roles render`, async () => {
    for (const codigo of adminOnly ? ["administrador"] : ["administrador", "editor"]) {
      reset({ roles: [role(codigo)] });
      assert.ok(await page({ params: Promise.resolve({ id: "1" }), searchParams: Promise.resolve({}) }));
    }
    if (adminOnly) {
      reset({ roles: [role("editor")] });
      await assert.rejects(() => page(), (error) => error.location === "/admin");
      assertNoBusinessAccess();
    }
  });
}

test("un cambio de rol se vuelve a comprobar en la siguiente llamada", async () => {
  reset({ roles: [role("editor")] });
  assert.equal((await guards.requireGestorContenido(request())).response, null);
  state.roles = [role("otro")];
  assert.equal((await guards.requireGestorContenido(request())).response.status, 403);
});

test("management GET APIs allow active administrator/editor", async () => {
  for (const codigo of ["administrador", "editor"]) {
    for (const path of ["actividades", "museo", "actividades/[id]/participantes", "paginas/[id]", "paginas/imagenes"]) {
      reset({ roles: [role(codigo)] });
      const route = await import(pathToFileURL(join(root, "src/app/api/admin", path, "route.js")));
      const response = await route.GET(request(), { params: Promise.resolve({ id: "1" }) });
      assert.equal(response.status, 200);
      assert.ok(state.calls.length > 0);
    }
  }
});

test("páginas: un editor autorizado edita contenido, pero la validación va antes del servicio", async () => {
  const jsonRequest = (method, body) => new Request("http://localhost/api/admin/paginas", {
    method,
    body: JSON.stringify(body),
    headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" },
  });
  const load = async (path) => import(pathToFileURL(join(root, "src/app/api/admin/paginas", path, "route.js")));
  const secciones = await load("[id]/secciones/[codigo]");
  const valores = await load("valores");
  const valor = await load("valores/[id]");
  const integrantes = await load("integrantes");
  const params = (extra = {}) => ({ params: Promise.resolve({ id: "1", codigo: "portada", ...extra }) });

  for (const codigo of ["administrador", "editor"]) {
    // Cuerpos inválidos: 400 y ningún acceso a datos.
    for (const [handler, body, context] of [
      [secciones.PATCH, { campos: { inventado: "x" } }, params()],
      [secciones.PATCH, { campos: { titulo: "" } }, params()],
      [secciones.PATCH, { campos: { titulo: "Hola" } }, params({ id: "9" })],
      [secciones.PATCH, { campos: { titulo: "Hola" } }, params({ codigo: "no_existe" })],
      [valores.POST, { titulo: "" }, params()],
      [valores.PATCH, { ids: [1, 1] }, params()],
      [valor.PATCH, { titulo: "x" }, params({ id: "abc" })],
      [valor.DELETE, undefined, params({ id: "0" })],
      [integrantes.POST, { id_cargo: "Presidenta", nombre_integrante: "Ana" }, params()],
    ]) {
      reset({ roles: [role(codigo)] });
      const method = handler === valor.DELETE ? "DELETE" : "POST";
      const response = await handler(jsonRequest(method, body), context);
      assert.equal(response.status, 400, `${codigo} ${JSON.stringify(body)}`);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.deepEqual(state.calls, []);
    }

    // Cuerpo válido: llega al servicio y se invalida el sitio público.
    reset({ roles: [role(codigo)] });
    globalThis.__rqRevalidated = [];
    const response = await secciones.PATCH(jsonRequest("PATCH", { campos: { titulo: "Nuevo título" } }), params());
    assert.equal(response.status, 200);
    assert.ok(state.calls.length > 0);
    assert.deepEqual(globalThis.__rqRevalidated, ["/", "/quienes-somos"]);
  }
});

test("personal profile and session probe keep their explicit session-only policy", async () => {
  for (const path of ["perfil", "market"]) {
    reset();
    const page = await import(pathToFileURL(join(root, "src/app/admin/(panel)", path, "page.jsx")));
    assert.ok(await page.default());
  }
  for (const path of ["src/app/api/admin/route.js", "src/app/api/admin/perfil/route.js"]) {
    reset();
    const route = await import(pathToFileURL(join(root, path)));
    assert.equal((await route.GET(request())).status, 200);
  }
});

test("mutation origin remains mandatory for authorized users", async () => {
  reset({ roles: [role("administrador")] });
  const req = new Request("http://localhost/api/admin", { method: "DELETE", headers: { host: "localhost", origin: "http://foreign.example" } });
  assert.equal((await guards.requireAdministrador(req)).response.status, 403);
  assertNoBusinessAccess();
});

test("admin mutations authenticate from the Cookie header when cookies() is empty", async () => {
  const token = signedToken(1);
  reset({ token: null, roles: [role("administrador")] });
  const req = new Request("http://localhost/api/admin", {
    method: "DELETE",
    headers: {
      origin: "http://localhost",
      host: "localhost",
      cookie: `rq_session=${token}`,
    },
  });
  assert.equal((await guards.requireGestorContenido(req)).response, null);
});

test.after(() => hooks.deregister());
