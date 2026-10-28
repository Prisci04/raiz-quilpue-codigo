import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

// Execute the real server modules, replacing only framework I/O and repositories.
// Node >= 22.15 supports synchronous module hooks; no HTTP server or database needed.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const swc = require("next/dist/build/swc");
await swc.loadBindings();
globalThis.fetch = async () => { throw new Error("Network disabled in authorization tests"); };

const state = globalThis.__rqSecurityTest = {};
const activeUser = { id: 1, nombre: "Test", email: "admin@example.com", estado: "activo", tipo_usuario: "interno" };
const role = (codigo, estado = "activo") => ({ codigo, nombre: codigo, estado });
function reset({ user = activeUser, roles = [], token = "a".repeat(43), session = true } = {}) {
  Object.assign(state, { user, roles, token, session, error: null, calls: [], queries: [], deleted: 0, bodyReads: 0 });
}

function query(table) {
  const filters = [];
  const record = { table, filters, single: false };
  state.queries.push(record);
  const chain = {
    select() { return chain; },
    eq(key, value) { filters.push([key, value]); return chain; },
    order() { return chain; },
    limit() { return chain; },
    maybeSingle() { record.single = true; return chain; },
    then(onValue, onError) {
      let data = [];
      if (table === "usuario_roles") {
        data = state.roles.filter((entry) => filters.every(([key, value]) =>
          key === "usuario_id" ? value === state.user?.id : entry[key.replace("roles.", "")] === value,
        )).map((roles) => ({ roles }));
      } else if (table === "usuarios") {
        data = state.users ?? [];
        for (const [key, value] of filters) data = data.filter((entry) => entry[key] === value);
      } else if (table === "roles") data = state.roles.filter((entry) => entry.estado === "activo");
      else throw new Error(`Unexpected table: ${table}`);
      return Promise.resolve({ data: record.single ? data[0] ?? null : data, error: state.error }).then(onValue, onError);
    },
  };
  return chain;
}
state.query = query;
state.load = (name) => {
  state.calls.push(name);
  if (name.startsWith("list")) return [];
  if (name.startsWith("count")) return 0;
  return { id: 1, titulo: "Test", estado: "borrador" };
};

const mocks = new Map([
  ["server-only", "export {};"],
  ["next/link", "export default function Link() { return null; }"],
  ["next/headers", `export async function cookies() { return { get() { return { value: globalThis.__rqSecurityTest.token }; } }; }`],
  ["next/navigation", `export function redirect(location) { throw Object.assign(new Error('redirect'), { location }); } export function notFound() { throw new Error('notFound'); }`],
  ["@/lib/supabase/admin", `export function getSupabaseAdminClient() { return { from: globalThis.__rqSecurityTest.query }; }`],
  ["@/services/auth.service", `
    const s = globalThis.__rqSecurityTest;
    export async function findSesionByTokenHash() { return s.session ? { id: 1, usuario_id: 1, fecha_expiracion: new Date(Date.now()+3600000).toISOString(), ultima_actividad: new Date().toISOString() } : null; }
    export async function findUsuarioById() { return s.user; }
    export async function deleteSesionByTokenHash() { s.deleted++; }
    export async function insertSesion() { throw new Error('Session creation disabled'); }
    export async function touchSesion() {}
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
  assert.equal(state.queries.some(({ table }) => table !== "usuario_roles"), false);
}

test("usuarioTieneRol requires matching active role, including mixed assignments", async () => {
  for (const [roles, expected] of [
    [[], false], [[role("editor")], false], [[role("administrador", "inactivo")], false],
    [[role("administrador")], true], [[role("administrador", null)], false],
    [[role("administrador", "inactivo"), role("editor")], false],
  ]) {
    reset({ roles });
    assert.equal(await users.usuarioTieneRol(1, "administrador"), expected);
    assert.equal(await users.usuarioTieneRol(2, "administrador"), false);
  }
});

test("inactive roles are excluded from the list used to protect the last active administrator", async () => {
  reset();
  state.users = [{ ...activeUser, usuario_roles: [{ roles: role("administrador", "inactivo") }, { roles: role("editor") }] }];
  const result = await users.listUsuariosInternos();
  assert.deepEqual(result.usuarios[0].roles, [{ codigo: "editor", nombre: "editor" }]);
  delete state.users;
});

test("inactive users invalidate the session separately from role denial", async () => {
  reset({ user: { ...activeUser, estado: "inactivo" }, roles: [role("administrador")] });
  assert.equal(await validateSession(), null);
  assert.equal(state.deleted, 1);
  reset({ roles: [role("administrador", "inactivo")] });
  assert.equal((await validateSession()).user.id, 1);
  assert.equal(state.deleted, 0);
  assert.equal((await guards.requireAdministrador(request())).response.status, 403);
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
  ["usuario inactivo", { user: { ...activeUser, estado: "inactivo" } }, 401],
  ["usuario publico", { user: { ...activeUser, tipo_usuario: "publico" } }, 403],
  ["sin rol", {}, 403],
  ["rol inactivo", { roles: [role("administrador", "inactivo"), role("editor", "inactivo")] }, 403],
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

test("role deactivation is rechecked on the next API call", async () => {
  reset({ roles: [role("editor")] });
  assert.equal((await guards.requireGestorContenido(request())).response, null);
  state.roles[0].estado = "inactivo";
  assert.equal((await guards.requireGestorContenido(request())).response.status, 403);
});

test("management GET APIs allow active administrator/editor", async () => {
  for (const codigo of ["administrador", "editor"]) {
    for (const path of ["actividades", "museo", "actividades/[id]/participantes"]) {
      reset({ roles: [role(codigo)] });
      const route = await import(pathToFileURL(join(root, "src/app/api/admin", path, "route.js")));
      const response = await route.GET(request(), { params: Promise.resolve({ id: "1" }) });
      assert.equal(response.status, 200);
      assert.ok(state.calls.length > 0);
    }
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

test.after(() => hooks.deregister());
