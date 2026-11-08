import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
globalThis.fetch = async () => { throw new Error("Network disabled"); };
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
const IMAGE =
  "https://example.supabase.co/storage/v1/object/public/public-media/museo/aportes/12345678-1234-4123-8123-123456789abc.jpg";
const PORTADA =
  "https://example.supabase.co/storage/v1/object/public/public-media/museo/7/portada/12345678-1234-4123-8123-123456789abc.jpg";
const state = globalThis.__museoTest = {};

function aporteRow(overrides = {}) {
  return {
    id_aporte: 1,
    nombre_aportante: "Ana Pérez",
    correo_aportante: "ana@correo.cl",
    titulo: "Foto de la plaza",
    descripcion: "Una foto antigua",
    fecha_aproximada: "1950",
    lugar_referencia: "Plaza de Quilpué",
    imagen_url: IMAGE,
    fec_creacion: "2026-01-01T00:00:00Z",
    fec_revision: null,
    id_categoria_museo: 1,
    id_estado_revision: 1,
    id_usuario_revisor: null,
    categoria_museo: { nombre_categoria: "Fotografías" },
    estado_revision: { nombre_estado_revision: "Pendiente" },
    ...overrides,
  };
}

function reset(overrides = {}) {
  Object.assign(state, {
    writes: 0,
    reads: 0,
    cleanup: [],
    error: null,
    cleanupFails: false,
    beforeUpdate: null,
    aporte: aporteRow(overrides),
  });
}

state.client = {
  from() {
    let update;
    let deleting = false;
    const filters = [];
    const chain = {
      select() { return chain; },
      eq(key, value) { filters.push([key, value]); return chain; },
      order() { return chain; },
      update(value) { update = value; return chain; },
      delete() { deleting = true; return chain; },
      async maybeSingle() {
        if (state.error) return { data: null, error: state.error };
        if (deleting) {
          if (!state.aporte || !filters.every(([key, value]) => state.aporte[key] === value)) {
            return { data: null, error: null };
          }
          const deleted = { id_aporte: state.aporte.id_aporte };
          state.aporte = null;
          state.writes += 1;
          return { data: deleted, error: null };
        }
        if (!update) {
          state.reads += 1;
          if (state.aporte && filters.every(([key, value]) => state.aporte[key] === value)) {
            return { data: { ...state.aporte }, error: null };
          }
          return { data: null, error: null };
        }
        if (state.beforeUpdate) state.beforeUpdate();
        if (state.aporte && filters.every(([key, value]) => state.aporte[key] === value)) {
          Object.assign(state.aporte, update);
          if (update.id_estado_revision === 2) {
            state.aporte.estado_revision = { nombre_estado_revision: "Aprobado" };
          }
          if (update.id_estado_revision === 3) {
            state.aporte.estado_revision = { nombre_estado_revision: "Rechazado" };
          }
          state.writes += 1;
          return { data: { ...state.aporte }, error: null };
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
  "@/lib/auth/guard": "export async function requireGestorContenido(){return {response:null,user:{id:1,nombre:'Admin',apellido:'Raíz',email:'usuario@raizquilpue.cl'}};}",
  "@/services/catalogos.service": `export async function listCatalogo(){return [
    {id:1,nombre:"Pendiente"},
    {id:2,nombre:"Aprobado"},
    {id:3,nombre:"Rechazado"},
  ];}
  export async function listCatalogosMuseo(){return {categoria_museo:[{id:1,nombre:"Fotografías"}],estado_revision:[{id:1,nombre:"Pendiente"},{id:2,nombre:"Aprobado"},{id:3,nombre:"Rechazado"}]};}`,
  "@/services/storage.service": "export async function deleteImage(path){const s=globalThis.__museoTest;s.cleanup.push(path);if(s.cleanupFails)throw new Error('Storage unavailable');} export async function deleteOwnedPortada(url){globalThis.__museoTest.cleanup.push(url);return true;}",
};

const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(stubs, name)) return { url: "museo-mock:" + name, shortCircuit: true };
    if (name.startsWith("@/")) {
      const base = resolve(root, "src", name.slice(2));
      const path = [base + ".js", base + ".mjs", base].find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );
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
const route = await import("../src/app/api/admin/museo/[id]/route.js");

test("aceptar un aporte pendiente lo deja aprobado sin crear otra pieza", async () => {
  reset();
  const result = await service.aprobarAporteMuseoAdmin(1, 9);
  assert.equal(result.aprobado, true);
  assert.equal(result.aporte.estado_revision, "Aprobado");
  assert.equal(result.aporte.id, 1);
  assert.equal(state.aporte.id_estado_revision, 2);
  assert.equal(state.aporte.id_usuario_revisor, 9);
  assert.equal(state.writes, 1);
});

test("rechazar un aporte pendiente no borra su imagen", async () => {
  reset();
  const result = await service.rechazarAporteMuseoAdmin(1, 9);
  assert.equal(result.rechazado, true);
  assert.equal(result.aporte.estado_revision, "Rechazado");
  assert.deepEqual(state.cleanup, []);
});

test("un aporte ya procesado no se vuelve a aprobar ni rechazar", async () => {
  reset({
    id_estado_revision: 2,
    estado_revision: { nombre_estado_revision: "Aprobado" },
  });
  assert.deepEqual(await service.aprobarAporteMuseoAdmin(1, 9), { error: "ALREADY_PROCESSED" });
  assert.deepEqual(await service.rechazarAporteMuseoAdmin(1, 9), { error: "ALREADY_PROCESSED" });
  assert.equal(state.writes, 0);

  reset();
  assert.deepEqual(await service.aprobarAporteMuseoAdmin(99, 9), { error: "NOT_FOUND" });
});

test("la actualización concurrente gana: rechazar no pisa un aporte ya aprobado", async () => {
  reset();
  state.beforeUpdate = () => {
    state.aporte.id_estado_revision = 2;
    state.aporte.estado_revision = { nombre_estado_revision: "Aprobado" };
  };
  assert.deepEqual(await service.rechazarAporteMuseoAdmin(1, 9), { error: "ALREADY_PROCESSED" });
  assert.equal(state.aporte.id_estado_revision, 2);
  assert.equal(state.writes, 0);
});

test("eliminar un aporte borra su imagen propia después del delete", async () => {
  reset();
  assert.equal(await service.deleteAporteMuseoAdmin(1), true);
  assert.deepEqual(state.cleanup, ["museo/aportes/12345678-1234-4123-8123-123456789abc.jpg"]);
  assert.equal(await service.deleteAporteMuseoAdmin(1), null);
  assert.equal(state.cleanup.length, 1);
});

test("si el almacenamiento falla tras borrar, el aporte ya quedó eliminado", async () => {
  reset();
  state.cleanupFails = true;
  const previous = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    assert.equal(await service.deleteAporteMuseoAdmin(1), true);
  } finally {
    console.error = previous;
  }
  assert.equal(state.aporte, null);
  assert.equal(state.cleanup.length, 1);
  assert.equal(logs.length, 1);
});

test("una pieza publicada puede conservar una portada antigua del museo", async () => {
  reset({
    imagen_url: PORTADA,
    id_estado_revision: 2,
    estado_revision: { nombre_estado_revision: "Aprobado" },
  });
  assert.equal(await service.deletePiezaMuseoAdmin(1), true);
  assert.deepEqual(state.cleanup, [PORTADA]);
});

test("Museo PATCH rechaza JSON malformado con 400 y no escribe", async () => {
  reset({
    id_estado_revision: 2,
    estado_revision: { nombre_estado_revision: "Aprobado" },
  });
  const response = await route.PATCH(
    new Request("http://localhost", { method: "PATCH", body: "{" }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(response.status, 400);
  assert.equal(state.writes, 0);
});

test.after(() => hooks.deregister());
