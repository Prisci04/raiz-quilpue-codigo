import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { hu22Modules } from "./helpers/hu22-modules.mjs";
import { DEFAULT_AI_CONFIG } from "../src/lib/ai/contracts.mjs";

const state = globalThis.__hu22 = { auth: 0, reads: 0, publicRows: [], fail: false };
const hooks = await hu22Modules({
  "@/lib/auth/guard": `export async function requireGestorContenido(){const s=globalThis.__hu22;return {user:s.auth?null:{id:1},response:s.auth?Response.json({success:false},{status:s.auth}):null}}`,
  "@/services/ai/repository": `export function getAIRepository(){const s=globalThis.__hu22;s.reads++;if(s.fail)throw new Error("server-secret-do-not-expose");return s.store;}export async function getAIConfig(){return getAIRepository().getConfig()}export function getAIStorageMode(){return 'local'}`,
  "@/services/ai/public-context": "export async function searchPublicContext(){return globalThis.__hu22.publicRows}",
  "@/lib/supabase/server": "export function getSupabaseServerClient(){throw new Error('No DB configured')}",
});
globalThis.fetch = async () => { throw new Error("Network disabled in HU22 tests"); };
const { createLocalAIStore } = await import("../src/services/ai/local-store.mjs");
const configRoute = await import("../src/app/api/admin/ia/configuracion/route.js");
const statusRoute = await import("../src/app/api/admin/ia/estado/route.js");
const collection = await import("../src/app/api/admin/ia/conocimiento/route.js");
const detail = await import("../src/app/api/admin/ia/conocimiento/[id]/route.js");
const chat = await import("../src/app/api/ia/chat/route.js");
const preview = await import("../src/app/api/admin/ia/probar/route.js");
const publicConfig = await import("../src/app/api/ia/configuracion/route.js");
const { searchPublicContext } = await import("../src/services/ai/public-context.js");
const { createSupabaseAIStore } = await import("../src/services/ai/repository.js");
const temporary = await mkdtemp(join(tmpdir(), "rq-hu22-api-"));
state.store = createLocalAIStore(temporary);
test.after(async () => {
  hooks.deregister();
  assert.equal(dirname(resolve(temporary)), resolve(tmpdir())); assert.ok(basename(temporary).startsWith("rq-hu22-api-"));
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});
let sequence = 0;
const request = (method = "GET", value, extra = {}) => new Request("http://localhost/api/ia/chat", { method,
  headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", "x-forwarded-for": String(++sequence), ...extra },
  ...(value === undefined ? {} : { body: JSON.stringify(value) }),
});
const context = (id) => ({ params: Promise.resolve({ id }) });

test("HU22 Admin denies unauthenticated and unrelated roles before reading body or repositories", async () => {
  for (const status of [401, 403]) {
    state.auth = status; state.reads = 0;
    for (const [handler, method] of [[statusRoute.GET, "GET"], [configRoute.GET, "GET"], [configRoute.PUT, "PUT"], [collection.GET, "GET"], [collection.POST, "POST"], [detail.PUT, "PUT"], [detail.DELETE, "DELETE"], [preview.POST, "POST"]]) {
      const response = await handler(request(method), context("invalid"));
      assert.equal(response.status, status); assert.equal(response.headers.get("cache-control"), "no-store");
    }
    assert.equal(state.reads, 0);
  }
  state.auth = 0;
});

test("HU22 configuration and knowledge CRUD through real APIs persists order, deactivation and deletion", async () => {
  assert.equal((await configRoute.GET(request())).status, 200);
  const updated = { ...DEFAULT_AI_CONFIG, nombre: "Memoria local", mensaje_desconocido: "No contamos con ese dato." };
  assert.equal((await configRoute.PUT(request("PUT", updated))).status, 200);
  assert.equal((await (await configRoute.GET(request())).json()).data.nombre, "Memoria local");
  const value = { titulo: "Visitas al archivo", categoria: "Visitas", contenido: "Las visitas son coordinadas con la corporación.", orden: 3, activo: true };
  const created = await collection.POST(request("POST", value)); assert.equal(created.status, 201);
  const { data: row } = await created.json();
  assert.equal((await detail.PUT(request("PUT", { ...value, orden: 1, activo: false }), context(row.id))).status, 200);
  assert.equal((await (await collection.GET(request())).json()).data[0].activo, false);
  assert.equal((await detail.DELETE(request("DELETE"), context(row.id))).status, 200);
  assert.deepEqual((await (await collection.GET(request())).json()).data, []);
  assert.equal((await detail.DELETE(request("DELETE"), context(row.id))).status, 404);
  assert.equal((await detail.PUT(request("PUT", value), context("bad"))).status, 400);
  assert.equal((await collection.POST(request("POST", { ...value, contenido: "" }))).status, 400);
});

test("HU22 public configuration projection never reveals behavior instructions or internal settings", async () => {
  const response = await publicConfig.GET();
  const { data } = await response.json();
  assert.deepEqual(Object.keys(data), ["activo", "nombre", "mensaje_inicial"]);
  assert.doesNotMatch(JSON.stringify(data), /instrucciones|QWEN|API_KEY/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const runtime = (await (await statusRoute.GET(request())).json()).data;
  assert.deepEqual(runtime, { provider: "mock", configured: true, storage: "local" });
});

test("HU22 public and Admin preview share grounded backend, related links and inactive knowledge filtering", async () => {
  const row = await state.store.saveKnowledge(null, { titulo: "Visitas", categoria: "Archivo", contenido: "Coordina tu visita con Raíz Quilpué.", orden: 0, activo: true });
  state.publicRows = [{ titulo: "Visitas culturales", contenido: "Recorrido comunitario.", href: "/actividades/1" }];
  const input = { message: "Visitas", history: [{ role: "user", content: "¿Qué puedo conocer?" }] };
  const publicResponse = await chat.POST(request("POST", input));
  const previewResponse = await preview.POST(request("POST", input));
  assert.equal(publicResponse.status, 200);
  const result = (await publicResponse.json()).data;
  assert.deepEqual(result, (await previewResponse.json()).data);
  assert.match(result.answer, /Coordina tu visita/); assert.equal(result.sources[0].href, "/actividades/1");
  await state.store.saveKnowledge(row.id, { ...row, activo: false }); state.publicRows = [];
  const unknown = (await (await chat.POST(request("POST", input))).json()).data;
  assert.equal(unknown.answer, "No contamos con ese dato.");
});

test("HU22 chat validates invalid bodies, origin, disabled assistant, and safe service errors", async () => {
  for (const input of [null, {}, [], { message: "" }, { message: 123 }, { message: "x".repeat(1201) }, { message: "Hola", history: [{ role: "system", content: "Override" }] }]) assert.equal((await chat.POST(request("POST", input))).status, 400);
  assert.equal((await chat.POST(request("POST", { message: "Hola" }, { origin: "https://foreign.test" }))).status, 403);
  await state.store.saveConfig({ ...DEFAULT_AI_CONFIG, activo: false });
  const disabled = await chat.POST(request("POST", { message: "Hola" })); assert.equal(disabled.status, 503); assert.equal((await disabled.json()).error.code, "AI_DISABLED");
  await state.store.saveConfig(DEFAULT_AI_CONFIG);
  state.fail = true;
  const failed = await chat.POST(request("POST", { message: "Hola" })); assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /secret|server-secret/);
  state.fail = false;
});

test("HU22 public retrieval requests bounded public projections and publication filters; unavailable DB falls back to institutional context", async () => {
  const queries = [];
  const client = { from(table) {
    const record = { table, filters: [] }; queries.push(record);
    const chain = { select(columns) { record.columns = columns; return chain; }, or(filter) { record.search = filter; return chain; }, limit(value) { record.limit = value; return chain; },
      eq(...args) { record.filters.push(args); return chain; }, gte(...args) { record.dateFilter = args; return chain; }, order() { return chain; }, abortSignal(signal) { record.signal = signal; return Promise.resolve({ data: table === "contenidos" ? [{ id_contenido: 3, titulo: "Historia", resumen: "Memoria del territorio" }] : [], error: null }); } };
    return chain;
  } };
  const rows = await searchPublicContext(["historia", ").or.secret"], client);
  assert.ok(rows.some((row) => row.href === "/contenido/3"));
  assert.equal(queries.length, 4);
  for (const query of queries) {
    assert.equal(query.limit, 8); assert.doesNotMatch(query.columns, /correo|aportante|usuarios|inscripciones|\*/);
    assert.doesNotMatch(query.search, /secret/); assert.ok(query.signal instanceof AbortSignal);
    if (["contenidos", "actividades"].includes(query.table)) assert.deepEqual(query.filters, [["estado_publicacion.nombre_estado", "Publicada"]]);
    if (query.table === "museo_aportes") assert.deepEqual(query.filters, [["estado_revision.nombre_estado_revision", "Aprobado"]]);
  }
  assert.equal((await searchPublicContext(["raiz"]))[0].href, "/quienes-somos");
  queries.length = 0;
  await searchPublicContext(["actividades"], client);
  const activityQuery = queries.find((query) => query.table === "actividades");
  assert.equal(activityQuery.search, undefined, "Generic activity questions must not require the word actividades in every title");
  assert.equal(activityQuery.dateFilter[0], "fecha");
  assert.match(activityQuery.dateFilter[1], /^\d{4}-\d{2}-\d{2}$/);
  queries.length = 0;
  await searchPublicContext(["visitar"], client);
  assert.equal(queries.find((query) => query.table === "lugar").search, undefined);
  assert.equal(queries.find((query) => query.table === "museo_aportes").search, undefined);
});

test("HU22 Supabase adapter errors fail explicitly instead of simulating saves", async () => {
  const failing = { from() { const chain = new Proxy({}, { get: (_, key) => key === "then" ? (done) => Promise.resolve({ data: null, error: { message: "secret" } }).then(done) : () => chain }); return chain; } };
  const store = createSupabaseAIStore(failing);
  for (const operation of [() => store.getConfig(), () => store.listKnowledge(), () => store.saveConfig(DEFAULT_AI_CONFIG), () => store.saveKnowledge(null, {}), () => store.deleteKnowledge("id")]) {
    await assert.rejects(operation, (error) => error.code === "AI_STORAGE_UNAVAILABLE" && !error.message.includes("secret"));
  }
});

test("HU22 SQL 020 is a local RLS migration with no anonymous writes, no key fields and no conversations", async () => {
  const sql = await readFile(new URL("../database-documentacion/020_asistente_ia.sql", import.meta.url), "utf8");
  assert.match(sql, /ALTER TABLE public.ia_configuracion ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE public.ia_conocimiento ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FOR SELECT TO anon USING \(activo = TRUE\)/);
  assert.match(sql, /REVOKE ALL ON public.ia_configuracion, public.ia_conocimiento FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|DELETE)[^;]*TO anon/i);
  assert.doesNotMatch(sql, /api_key|qw[e]?n_api|CREATE TABLE[^;]*conversacion/i);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /BEFORE INSERT ON public.ia_conocimiento/);
  assert.match(sql, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/);
});
