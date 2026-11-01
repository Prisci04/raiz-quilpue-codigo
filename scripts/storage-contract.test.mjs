import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { parseOwnedAporteImageUrl } from "../src/lib/media/policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
globalThis.fetch = async () => { throw new Error("Network disabled"); };
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
const state = globalThis.__storageTest = {};
function reset() {
  Object.assign(state, {
    bucket: { public: true, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg", "application/pdf"] },
    uploads: 0, removed: [], inserts: 0, uploadError: null, insertError: null, removeError: null,
  });
}
state.storage = {
  async getBucket() { return { data: state.bucket, error: null }; },
  createBucket() { throw new Error("Runtime provisioning forbidden"); },
  updateBucket() { throw new Error("Runtime privacy change forbidden"); },
  from() {
    return {
      async upload() { state.uploads++; return { error: state.uploadError }; },
      async remove(paths) { state.removed.push(...paths); return { error: state.removeError }; },
      getPublicUrl(path) { return { data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/public-media/" + path } }; },
    };
  },
};
const stubs = {
  "server-only": "export {};",
  "@/lib/supabase/admin": "export function getSupabaseAdminClient(){return {storage:globalThis.__storageTest.storage};}",
  "@/services/admin-community.service": "export async function createAporteMuseo(){const s=globalThis.__storageTest;s.inserts++;if(s.insertError)throw new Error('insert failed');return {id:1};}",
  "@/services/catalogos.service": "export async function listCatalogo(){return [{id:1,nombre:'Documentos'}];}",
};
const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(stubs, name)) return { url: "storage-mock:" + name, shortCircuit: true };
    if (name.startsWith("@/")) {
      const base = resolve(root, "src", name.slice(2));
      return { url: pathToFileURL([base, base + ".js", base + ".mjs"].find(existsSync)).href, shortCircuit: true };
    }
    return next(name, context);
  },
  load(url, context, next) {
    if (url.startsWith("storage-mock:")) return { format: "module", source: stubs[url.slice(13)], shortCircuit: true };
    return next(url, context);
  },
});
const storage = await import("../src/services/storage.service.js");
const { POST } = await import("../src/app/api/museo/aportes/route.js");

test("existing public bucket uploads work without provisioning or privacy changes", async () => {
  reset();
  const url = await storage.uploadImage({ path: "example.jpg", bytes: new Uint8Array([1]), contentType: "image/jpeg" });
  assert.ok(url.endsWith("/example.jpg"));
  assert.equal(state.uploads, 1);
});
test("private, missing, incompatible or smaller buckets fail before upload", async () => {
  for (const bucket of [null, { public: false }, { public: true, file_size_limit: 0 }, { public: true, allowed_mime_types: ["application/pdf"] }]) {
    reset(); state.bucket = bucket;
    await assert.rejects(() => storage.uploadImage({ path: "example.jpg", bytes: new Uint8Array([1]), contentType: "image/jpeg" }));
    assert.equal(state.uploads, 0);
  }
});
test("aporte image cleanup supports owned images and rejects foreign/traversal URLs", () => {
  const url = "https://example.supabase.co/storage/v1/object/public/public-media/museo/aportes/12345678-1234-4123-8123-123456789abc.jpg";
  assert.ok(parseOwnedAporteImageUrl(url));
  for (const bad of [
    url.replace("example.supabase.co", "foreign.example"),
    url + "?download=1",
    url.replace(".jpg", ".pdf"),
    url.replace(".jpg", ".exe"),
    url.replace("aportes/", "aportes/%2e%2e/"),
  ]) {
    assert.equal(parseOwnedAporteImageUrl(bad), null);
  }
});
function aporteRequest(bytes = jpeg, type = "image/jpeg", name = "foto.jpg", extra = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    nombre: "Persona de prueba",
    correo: "aporte@example.com",
    id_categoria_museo: "1",
    titulo: "Documento",
    descripcion: "Solo prueba local",
    ...extra,
  })) form.set(key, value);
  form.set("archivo", new File([bytes], name, { type }));
  return new Request("http://localhost/api/museo/aportes", { method: "POST", body: form });
}
test("public contribution rejects a PDF before upload", async () => {
  reset();
  assert.equal((await POST(aporteRequest("%PDF-1.7\ncontent", "application/pdf", "documento.pdf"))).status, 400);
  assert.equal(state.uploads, 0);
  assert.equal(state.inserts, 0);
});
test("public contribution rejects a forged image before upload", async () => {
  reset();
  assert.equal((await POST(aporteRequest("executable", "image/jpeg", "foto.jpg"))).status, 415);
  assert.equal(state.uploads, 0);
  assert.equal(state.inserts, 0);
});
test("public contribution accepts a validated image and writes its original URL", async () => {
  reset();
  assert.equal((await POST(aporteRequest())).status, 201);
  assert.equal(state.uploads, 1);
  assert.equal(state.inserts, 1);
  assert.deepEqual(state.removed, []);
});
test("upload failure does not delete an object which was never created by this request", async () => {
  reset(); state.uploadError = { message: "upload failed" };
  const previous = console.error; console.error = () => {};
  try { assert.equal((await POST(aporteRequest())).status, 500); } finally { console.error = previous; }
  assert.equal(state.inserts, 0);
  assert.deepEqual(state.removed, []);
});
test("database failure compensates only the file uploaded by the current request", async () => {
  reset(); state.insertError = true;
  const previous = console.error; console.error = () => {};
  try { assert.equal((await POST(aporteRequest())).status, 500); } finally { console.error = previous; }
  assert.equal(state.removed.length, 1);
  assert.match(state.removed[0], /^museo\/aportes\/[a-f0-9-]+\.jpg$/);
});

test.after(() => hooks.deregister());
