import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

// Real API handlers, validators, services and mappers; only auth/DB/Storage are local doubles.
globalThis.fetch = async () => { throw new Error("Network disabled"); };
const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = {
  id: 1, titulo: "Encuentro", descripcion: "Actividad cultural", fecha: "2099-01-02",
  hora_inicio: "12:00", hora_fin: "13:00", lugar: "Centro cultural",
  direccion: "Av. Los Carrera 100, Quilpué", google_place_id: "place-test",
  publico_objetivo: "todas_edades", modalidad: "presencial", tipo_participacion: "inscripcion",
  cupos: 20, tipo_valor: "gratuito", valor_monto: null, forma_pago: null,
  informacion_adicional: null, imagen_url: null, estado: "publicada",
};
const state = globalThis.__hu23Persistencia = {};
function reset(extra = {}) { Object.assign(state, { rows: [{ ...fixture }], writes: [], selects: [], reads: 0, missing: false, dbError: null, ...extra }); }
state.client = {
  from(table) {
    let columns = "", operation, payload, single = false;
    const filters = [];
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      order() { return query; },
      maybeSingle() { single = true; return query; }, single() { single = true; return query; },
      insert(value) { operation = "insert"; payload = value; return query; },
      update(value) { operation = "update"; payload = value; return query; },
      then(done, fail) {
        state.reads++;
        state.selects.push({ table, columns });
        // A PostgREST statement failing on a missing column commits no mutation.
        let error = state.dbError;
        if (!error && state.missing && (/\b(direccion|google_place_id)\b/.test(columns)
          || ["direccion", "google_place_id"].some((key) => Object.hasOwn(payload ?? {}, key)))) {
          error = { code: "42703", message: 'column actividades.direccion does not exist' };
        }
        if (error) return Promise.resolve({ data: null, error }).then(done, fail);
        let rows = table === "actividades" ? state.rows.filter((row) => filters.every((filter) => filter(row))) : [];
        if (operation === "insert") {
          const row = { ...payload, id: 2 }; state.rows.push(row); rows = [row];
        } else if (operation === "update") rows.forEach((row) => Object.assign(row, payload));
        if (operation) state.writes.push({ operation, payload: { ...payload } });
        const selected = rows.map((row) => Object.fromEntries(columns.split(",").map((key) => [key, row[key]])));
        return Promise.resolve({ data: single ? selected[0] ?? null : selected, error: null }).then(done, fail);
      },
    };
    return query;
  },
};
const mocks = {
  "server-only": "export {};",
  "@/lib/supabase/admin": "export function getSupabaseAdminClient(){return globalThis.__hu23Persistencia.client;}",
  "@/lib/supabase/server": "export function getSupabaseServerClient(){return globalThis.__hu23Persistencia.client;}",
  "@/lib/auth/guard": "export async function requireGestorContenido(){return {response:null,user:{id:1}};}",
  "@/services/storage.service": "export async function deleteImage(){throw new Error('Unexpected cleanup');} export async function deleteOwnedPortada(){throw new Error('Unexpected cover change');}",
};
const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(mocks, name)) return { url: "hu23-mock:" + name, shortCircuit: true };
    if (name.startsWith("@/")) {
      const base = resolve(root, "src", name.slice(2));
      return { url: pathToFileURL([base, base + ".js", base + ".mjs"].find(existsSync)).href, shortCircuit: true };
    }
    return next(name, context);
  },
  load(url, context, next) {
    if (url.startsWith("hu23-mock:")) return { format: "module", source: mocks[url.slice(10)], shortCircuit: true };
    return next(url, context);
  },
});
const route = await import("../src/app/api/admin/actividades/[id]/route.js");
const collection = await import("../src/app/api/admin/actividades/route.js");
const admin = await import("../src/services/admin-community.service.js");
const publicService = await import("../src/services/actividades.service.js");
const { mapActividadVista } = await import("../src/lib/actividades.js");
const context = { params: Promise.resolve({ id: "1" }) };
const request = (method, value) => new Request("http://localhost/api/admin/actividades/1", {
  method, ...(value === undefined ? {} : { body: JSON.stringify(value) }),
});
async function patch(value) { return route.PATCH(request("PATCH", value), context); }

test("POST and GET preserve editorial address and selected Place ID for every modality", async () => {
  for (const modalidad of ["presencial", "hibrida", "virtual"]) {
    reset();
    const response = await collection.POST(request("POST", { ...fixture, modalidad, direccion: "  Dirección propia  " }));
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.equal(data.direccion, "Dirección propia");
    assert.equal(data.google_place_id, fixture.google_place_id);
    assert.equal(state.rows[1].modalidad, modalidad);
    assert.equal((await (await route.GET(request("GET"), context)).json()).data.direccion, fixture.direccion);
  }
});
test("partial editing preserves omitted location and nullable business fields", async () => {
  reset();
  state.rows[0].forma_pago = "Transferencia";
  state.rows[0].informacion_adicional = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Traer materiales." }] }] };
  const before = structuredClone(state.rows[0]);
  assert.equal((await patch({ titulo: "Título editado" })).status, 200);
  for (const key of ["direccion", "google_place_id", "lugar", "forma_pago", "informacion_adicional", "cupos"]) {
    assert.deepEqual(state.rows[0][key], before[key], key);
  }
  assert.equal((await patch({ direccion: "Calle nueva 10", google_place_id: "new-place" })).status, 200);
  assert.equal(state.rows[0].direccion, "Calle nueva 10");
  assert.equal(state.rows[0].google_place_id, "new-place");
});
test("explicit null clears a reference independently of editorial address and lugar", async () => {
  reset();
  assert.equal((await patch({ google_place_id: null })).status, 200);
  assert.equal(state.rows[0].google_place_id, null);
  assert.equal(state.rows[0].direccion, fixture.direccion);
  assert.equal(state.rows[0].lugar, fixture.lugar);
  assert.equal((await patch({ direccion: null })).status, 200);
  assert.equal(state.rows[0].direccion, null);
});
test("status-only PATCH changes only estado, including publication and nulls", async () => {
  reset();
  for (const estado of ["borrador", "publicada", "cancelada"]) {
    assert.equal((await patch({ estado })).status, 200);
    assert.deepEqual(state.writes.at(-1).payload, { estado });
    assert.deepEqual(state.rows[0], { ...fixture, estado });
  }
});
test("switching to virtual preserves historical text/reference for an explicit future decision", async () => {
  reset();
  assert.equal((await patch({ modalidad: "virtual" })).status, 200);
  assert.deepEqual(state.rows[0], { ...fixture, modalidad: "virtual" });
  assert.equal((await patch({ google_place_id: null })).status, 200);
  assert.equal(state.rows[0].direccion, fixture.direccion);
});
test("malformed/null/array/empty JSON returns 400 before loading or mutating privileged data", async () => {
  for (const body of ["{", "null", "[]", "{}", "42", ""]) {
    reset();
    const response = await route.PATCH(new Request("http://localhost", { method: "PATCH", body }), context);
    assert.equal(response.status, 400, body);
    assert.equal(state.reads, 0);
    assert.deepEqual(state.writes, []);
  }
});
test("invalid location values fail validation without mutation", async () => {
  for (const value of [{ direccion: 3 }, { direccion: "x".repeat(501) }, { google_place_id: {} }]) {
    reset();
    assert.equal((await patch(value)).status, 400);
    assert.deepEqual(state.writes, []);
  }
});
test("public detail carries new fields through both mappers; lists keep their minimal projection", async () => {
  reset();
  const detail = await publicService.getActividadById(1);
  assert.equal(detail.direccion, fixture.direccion);
  assert.equal(detail.google_place_id, fixture.google_place_id);
  assert.equal(mapActividadVista(detail).google_place_id, fixture.google_place_id);
  state.selects = [];
  const list = await publicService.getActividades({ page: 1, limit: 10 });
  assert.equal(list.data[0].direccion, undefined);
  assert.ok(state.selects.filter((item) => item.table === "actividades").every((item) => !item.columns.includes("direccion")));
  state.rows[0].estado = "borrador";
  assert.equal(await publicService.getActividadById(1), null);
});
test("before SQL 013: legacy reads, creates, edits and quick publication remain functional", async () => {
  reset({ missing: true });
  delete state.rows[0].direccion;
  delete state.rows[0].google_place_id;
  assert.equal((await publicService.getActividadById(1)).direccion, null);
  assert.equal((await admin.getActividadAdmin(1)).google_place_id, null);
  assert.equal((await patch({ titulo: "Histórica editada" })).status, 200);
  assert.equal((await patch({ estado: "borrador" })).status, 200);
  const legacy = { ...fixture }; delete legacy.direccion; delete legacy.google_place_id;
  assert.equal((await collection.POST(request("POST", legacy))).status, 201);
  assert.ok(state.writes.every(({ payload }) => !Object.hasOwn(payload, "direccion") && !Object.hasOwn(payload, "google_place_id")));
});
test("before SQL 013: new nonnull location fails with explicit 503 instead of losing input", async () => {
  for (const value of [{ direccion: "Dirección nueva" }, { google_place_id: "selected-place" }]) {
    reset({ missing: true });
    delete state.rows[0].direccion; delete state.rows[0].google_place_id;
    const response = await patch(value);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "ACTIVIDAD_UBICACION_UNAVAILABLE");
    assert.deepEqual(state.writes, []);
  }
});
test("schema fallback does not hide unrelated database errors or retry writes", async () => {
  reset({ dbError: { code: "42501", message: "permission denied" } });
  await assert.rejects(() => admin.saveActividadAdmin(null, fixture), /Failed to save actividad/);
  assert.equal(state.reads, 1);
  assert.deepEqual(state.writes, []);
});
test.after(() => hooks.deregister());
