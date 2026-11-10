import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { hu22Modules } from "./helpers/hu22-modules.mjs";
import { DEFAULT_AI_CONFIG } from "../src/lib/ai/contracts.mjs";
const hooks = await hu22Modules();
test.after(() => hooks.deregister());
const { createSupabaseAIStore, getAIStorageMode } = await import("../src/services/ai/repository.js");

// In-memory PostgREST contract double. No remote connections or environment secrets.
function database() {
  const tables = { ia_configuracion: [{ id: 1, ...DEFAULT_AI_CONFIG }], ia_conocimiento: [] };
  const calls = [];
  const client = { from(table) {
    const state = { table, filters: [], action: "select" }; calls.push(state);
    const query = {
      select(columns, options) { state.columns = columns; state.options = options; return query; },
      eq(field, value) { state.filters.push([field, value]); return query; },
      order(field) { (state.order ??= []).push(field); return query; },
      limit(limit) { state.limit = limit; return query; },
      or(filter) { state.search = filter; return query; },
      single() { state.single = true; return query; }, maybeSingle() { state.single = true; return query; },
      insert(value) { state.action = "insert"; state.value = value; return query; },
      update(value) { state.action = "update"; state.value = value; return query; },
      delete() { state.action = "delete"; return query; },
      abortSignal(signal) {
        assert.ok(signal instanceof AbortSignal);
        let rows = tables[table].filter((row) => state.filters.every(([field, value]) => row[field] === value));
        if (state.options?.head) return Promise.resolve({ data: null, count: rows.length, error: null });
        if (state.action === "insert") { const row = { ...state.value, id: randomUUID(), created_at: "created", updated_at: "created" }; tables[table].push(row); rows = [row]; }
        if (state.action === "update") rows.forEach((row) => Object.assign(row, state.value, { updated_at: "updated" }));
        if (state.action === "delete") tables[table] = tables[table].filter((row) => !rows.includes(row));
        for (const field of [...(state.order || [])].reverse()) rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])));
        if (state.limit) rows = rows.slice(0, state.limit);
        const project = (row) => Object.fromEntries(state.columns.split(",").map((key) => [key, row[key]]));
        return Promise.resolve({ data: state.single ? rows[0] ? project(rows[0]) : null : rows.map(project), error: null });
      },
    }; return query;
  } }; return { client, tables, calls };
}
const section = { titulo: "Archivo", categoria: "Visitas", contenido: "Visitas a la memoria local.", orden: 1, activo: true };

test("HU22 Supabase config and knowledge CRUD survive new repository instances and preserve timestamps", async () => {
  const db = database(); const store = createSupabaseAIStore(db.client);
  await store.saveConfig({ ...DEFAULT_AI_CONFIG, activo: false, apiKey: "discard" });
  assert.equal((await createSupabaseAIStore(db.client).getConfig()).activo, false);
  assert.equal(db.tables.ia_configuracion[0].apiKey, undefined);
  const first = await store.saveKnowledge(null, section);
  await store.saveKnowledge(null, { ...section, titulo: "Antes", orden: 0 });
  assert.equal((await store.listKnowledge())[0].titulo, "Antes");
  const updated = await createSupabaseAIStore(db.client).saveKnowledge(first.id, { ...section, activo: false, created_at: "forged", id: "forged" });
  assert.equal(updated.created_at, "created"); assert.equal(updated.updated_at, "updated"); assert.equal(updated.id, first.id);
  await store.deleteKnowledge(first.id);
  await assert.rejects(() => store.deleteKnowledge(first.id), { code: "NOT_FOUND" });
  await assert.rejects(() => store.saveKnowledge(first.id, section), { code: "NOT_FOUND" });
  assert.equal((await store.listKnowledge()).length, 1);
  assert.ok(db.calls.every((call) => !call.columns.includes("*")));
});

test("HU22 Supabase active knowledge retrieval is bounded and filters are injection-safe", async () => {
  const db = database(); const store = createSupabaseAIStore(db.client);
  await store.saveKnowledge(null, section); await store.saveKnowledge(null, { ...section, activo: false });
  assert.equal((await store.searchKnowledge(["visitas", ").or(secret)"])).length, 1);
  const query = db.calls.at(-1);
  assert.deepEqual(query.filters, [["activo", true]]); assert.equal(query.limit, 30);
  assert.doesNotMatch(query.search, /secret/);
  assert.deepEqual(await store.searchKnowledge(["bad!()"]), []);
  db.tables.ia_conocimiento = Array.from({ length: 200 }, () => ({ ...section, id: randomUUID() }));
  await assert.rejects(() => store.saveKnowledge(null, section), { code: "KNOWLEDGE_LIMIT" });
});

test("HU22 storage defaults to Supabase in production and local only for development; no fallback on invalid mode", () => {
  assert.equal(getAIStorageMode({ NODE_ENV: "production" }), "supabase");
  assert.equal(getAIStorageMode({ NODE_ENV: "development" }), "local");
  assert.equal(getAIStorageMode({ AI_STORAGE: "supabase" }), "supabase");
  assert.throws(() => getAIStorageMode({ AI_STORAGE: "unknown" }), { code: "AI_STORAGE_UNAVAILABLE" });
});
