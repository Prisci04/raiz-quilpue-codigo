import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
globalThis.fetch = async () => { throw new Error("Network disabled"); };
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
const state = globalThis.__museoTest = {};
const original = "https://example.supabase.co/storage/v1/object/public/public-media/museo/aportes/12345678-1234-4123-8123-123456789abc.pdf";
const portada = "https://example.supabase.co/storage/v1/object/public/public-media/museo/7/portada/12345678-1234-4123-8123-123456789abc.jpg";
function reset() {
  Object.assign(state, { rpc: [], writes: 0, reads: 0, cleanup: [], response: {}, error: null, cleanupFails: false, beforeUpdate: null, aporte: { id: 1, estado_revision: "pendiente", pieza_id: null } });
}
state.client = {
  async rpc(name, params) { state.rpc.push({ name, params }); return { data: state.response, error: state.error }; },
  from() {
    state.reads++;
    let update;
    const filters = [];
    const chain = {
      select() { return chain; }, eq(key, value) { filters.push([key, value]); return chain; },
      is(key, value) { filters.push([key, value]); return chain; },
      update(value) { update = value; return chain; },
      async maybeSingle() {
        if (!update) return { data: state.aporte && { ...state.aporte }, error: null };
        if (state.beforeUpdate) state.beforeUpdate();
        if (state.aporte && filters.every(([key, value]) => state.aporte[key] === value)) {
          Object.assign(state.aporte, update); state.writes++;
          return { data: { id: 1 }, error: null };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  },
};
const stubs = {
  "server-only": "export {};",
  "@/lib/supabase/admin": "export function getSupabaseAdminClient(){return globalThis.__museoTest.client;}",
  "@/lib/supabase/server": "export function getSupabaseServerClient(){throw new Error('Unexpected public query');}",
  "@/lib/auth/guard": "export async function requireGestorContenido(){return {response:null,user:{id:1}};}",
  "@/services/storage.service": "export async function deleteImage(path){const s=globalThis.__museoTest;s.cleanup.push(path);if(s.cleanupFails)throw new Error('Storage unavailable');} export async function deleteOwnedPortada(url){globalThis.__museoTest.cleanup.push(url);return true;}",
};
const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(stubs, name)) return { url: "museo-mock:" + name, shortCircuit: true };
    if (name.startsWith("@/")) {
      const base = resolve(root, "src", name.slice(2));
      const path = [base, base + ".js", base + ".mjs"].find(existsSync);
      return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    return next(name, context);
  },
  load(url, context, next) {
    if (url.startsWith("museo-mock:")) return { format: "module", source: stubs[url.slice(11)], shortCircuit: true };
    return next(url, context);
  },
});
const service = await import("../src/services/admin-community.service.js");
const { runAdminCommunity } = await import("../src/lib/admin-community-http.js");
const route = await import("../src/app/api/admin/museo/[id]/route.js");

test("conversion delegates all writes to one RPC and preserves the original PDF", async () => {
  reset();
  state.response = { pieza: { id: 7, archivo_url: original, imagen_url: null, estado: "borrador" } };
  assert.deepEqual(await service.convertirAporteEnBorradorAdmin(1), state.response);
  assert.deepEqual(state.rpc, [{ name: "convertir_aporte_museo", params: { p_aporte_id: 1 } }]);
  assert.equal(state.reads, 0);
  assert.equal(state.writes, 0);
  assert.deepEqual(state.cleanup, []);
});

test("missing RPCs fail closed with 503 and perform no fallback writes or cleanup", async () => {
  for (const operation of [service.convertirAporteEnBorradorAdmin, service.deletePiezaMuseoAdmin, service.deleteAporteMuseoAdmin]) {
    for (const code of ["PGRST202", "42883", "42501"]) {
      reset(); state.error = { code };
      const response = await runAdminCommunity(new Request("http://localhost"), "local test", () => operation(1));
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error.code, "MUSEO_INTEGRITY_UNAVAILABLE");
      assert.equal(state.reads, 0);
      assert.equal(state.writes, 0);
      assert.deepEqual(state.cleanup, []);
    }
  }
});

test("conversion reports already processed/not found without inventing a successful piece", async () => {
  for (const error of ["ALREADY_PROCESSED", "NOT_FOUND"]) {
    reset(); state.response = { error };
    assert.deepEqual(await service.convertirAporteEnBorradorAdmin(1), { error });
    assert.equal(state.rpc.length, 1);
  }
});

test("transaction failure never cleans up an original file", async () => {
  for (const operation of [service.convertirAporteEnBorradorAdmin, service.deletePiezaMuseoAdmin, service.deleteAporteMuseoAdmin]) {
    reset(); state.error = { code: "23514" };
    await assert.rejects(() => operation(1), /Museo transaction failed/);
    assert.deepEqual(state.cleanup, []);
  }
});

test("piece deletion only cleans its own cover after the committed RPC, preserving the contribution file", async () => {
  reset(); state.response = { eliminado: true, pieza: { id: 7, imagen_url: portada, archivo_url: original } };
  assert.equal(await service.deletePiezaMuseoAdmin(7), true);
  assert.deepEqual(state.cleanup, [portada]);
  reset(); state.response = { eliminado: true, pieza: { id: 7, imagen_url: original, archivo_url: original } };
  assert.equal(await service.deletePiezaMuseoAdmin(7), true);
  assert.deepEqual(state.cleanup, []);
  reset(); state.response = { eliminado: false };
  assert.equal(await service.deletePiezaMuseoAdmin(7), null);
  assert.deepEqual(state.cleanup, []);
});

test("converted aporte deletion preserves shared files and retries do not delete again", async () => {
  reset(); state.response = { eliminado: true, conservar_archivo: true, archivo_url: original };
  await service.deleteAporteMuseoAdmin(1);
  state.response = { eliminado: false };
  await service.deleteAporteMuseoAdmin(1);
  assert.deepEqual(state.cleanup, []);
});

test("cleanup validates ownership and its failure does not report a failed DB deletion", async () => {
  reset(); state.response = { eliminado: true, conservar_archivo: false, archivo_url: original.replace("example.supabase.co", "foreign.example") };
  await service.deleteAporteMuseoAdmin(1);
  assert.deepEqual(state.cleanup, []);
  state.response.archivo_url = original;
  state.cleanupFails = true;
  const previous = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try { await service.deleteAporteMuseoAdmin(1); } finally { console.error = previous; }
  assert.equal(state.cleanup.length, 1);
  assert.equal(logs.length, 1);
});

test("concurrent conversion wins over rejection: conditional update must not overwrite it", async () => {
  reset();
  state.beforeUpdate = () => { state.aporte.estado_revision = "convertido"; state.aporte.pieza_id = 7; };
  assert.deepEqual(await service.rechazarAporteMuseoAdmin(1), { error: "ALREADY_PROCESSED" });
  assert.equal(state.aporte.pieza_id, 7);
  assert.equal(state.writes, 0);
  reset();
  assert.deepEqual(await service.rechazarAporteMuseoAdmin(1), { rechazado: true });
});

test("Museo PATCH rejects malformed JSON with 400 instead of dereferencing null", async () => {
  reset(); state.aporte = { id: 1 };
  const response = await route.PATCH(new Request("http://localhost", { method: "PATCH", body: "{" }), { params: Promise.resolve({ id: "1" }) });
  assert.equal(response.status, 400);
  assert.equal(state.writes, 0);
});

test.after(() => hooks.deregister());
