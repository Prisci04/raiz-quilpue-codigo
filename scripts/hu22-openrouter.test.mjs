import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { hu22Modules } from "./helpers/hu22-modules.mjs";
import { DEFAULT_AI_CONFIG } from "../src/lib/ai/contracts.mjs";
const hooks = await hu22Modules();
test.after(() => hooks.deregister());
const { createOpenRouterProvider, getAIProviderStatus, getAIProvider } = await import("../src/services/ai/providers.mjs");
const { readOpenRouterServerConfig, OPENROUTER_MODEL } = await import("../src/services/ai/openrouter-config.mjs");
// Generate a disposable marker, never a credential. No network calls in these tests.
const marker = crypto.randomUUID();
const env = { AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: marker };
const input = { message: "visitas", history: [], config: DEFAULT_AI_CONFIG,
  context: [{ titulo: "Visitas", contenido: "Coordina tu visita con la corporación.", href: "/actividades/3" }] };

test("HU22 OpenRouter: exact free Gemma, trusted endpoint, missing credential never calls fetch", async () => {
  assert.deepEqual(getAIProviderStatus(env), { provider: "openrouter", configured: true });
  assert.deepEqual(getAIProviderStatus({ AI_PROVIDER: "openrouter" }), { provider: "openrouter", configured: false });
  for (const override of [
    { OPENROUTER_MODEL: "google/gemma-4-31b-it" }, { OPENROUTER_MODEL: "openrouter/free" },
    { OPENROUTER_BASE_URL: "https://evil.test/api/v1" }, { OPENROUTER_API_KEY: "bad\nheader" },
  ]) assert.equal(readOpenRouterServerConfig({ ...env, ...override }).configured, false);
  let calls = 0;
  await assert.rejects(createOpenRouterProvider({}, { fetchImpl: () => { calls++; } }).respond(input),
    { code: "AI_PROVIDER_NOT_CONFIGURED" });
  assert.equal(calls, 0);
  assert.equal((await getAIProvider({ AI_PROVIDER: "mock" }).respond(input)).mode, "mock");
});

test("HU22 OpenRouter: bounded request, no paid routing, verified links and redacted answer", async () => {
  let sent;
  const result = await createOpenRouterProvider(env, { fetchImpl: async (url, options) => {
    sent = { url, ...options };
    return Response.json({ choices: [{ message: { content: "Visitas " + marker + " https://evil.test" } }] });
  } }).respond({ ...input, history: Array(12).fill({ role: "user", content: "visitas" }) });
  assert.equal(sent.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(sent.headers.Authorization, "Bearer " + marker);
  assert.equal(sent.redirect, "error");
  const body = JSON.parse(sent.body);
  assert.equal(body.model, OPENROUTER_MODEL);
  assert.equal(body.max_tokens, 600);
  assert.equal(body.messages.length, 6);
  assert.equal(body.provider.allow_fallbacks, false);
  assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0 });
  assert.equal(body.models, undefined);
  assert.equal(body.enable_thinking, undefined);
  assert.equal(sent.body.includes(marker), false);
  assert.equal(result.mode, "openrouter");
  assert.equal(JSON.stringify(result).includes(marker), false);
  assert.doesNotMatch(result.answer, /https:/);
  assert.deepEqual(result.sources, [{ title: "Visitas", href: "/actividades/3" }]);
});

test("HU22 OpenRouter: HTTP failures, malformed response and timeout are safe without retries", async () => {
  for (const status of [400, 401, 402, 404, 429, 500, 503]) {
    let calls = 0;
    await assert.rejects(createOpenRouterProvider(env, { fetchImpl: async () => {
      calls++; return new Response(marker, { status });
    } }).respond(input), error => error.code === (status === 429 ? "AI_TEMPORARILY_BUSY" : "AI_PROVIDER_UNAVAILABLE") && !error.message.includes(marker));
    assert.equal(calls, 1);
  }
  for (const response of [Response.json({}), Response.json({ choices: [{ message: { content: "" } }] }),
    new Response("invalid", { headers: { "Content-Type": "application/json" } })]) {
    await assert.rejects(createOpenRouterProvider(env, { fetchImpl: async () => response }).respond(input),
      { code: "AI_PROVIDER_UNAVAILABLE" });
  }
  await assert.rejects(createOpenRouterProvider(env, { timeoutMs: 5, fetchImpl: async (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("test deadline")), 1000);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    }) }).respond(input), { code: "AI_PROVIDER_UNAVAILABLE" });
});

test("HU22 free fallback: only upstream saturation allows ordered free models, capped at three", async () => {
  for (const successAt of [2, 3, 0]) {
    const models = [], diagnostics = [];
    const provider = createOpenRouterProvider(env, { onDiagnostic: entry => diagnostics.push(entry), fetchImpl: async (_url, request) => {
      models.push(JSON.parse(request.body).model);
      if (models.length === successAt) return Response.json({ choices: [{ message: { content: "Visitas culturales." } }] });
      return Response.json({ error: { metadata: { limit_source: "upstream_provider_shared_pool", raw: marker } } }, { status: 429 });
    } });
    if (successAt) assert.equal((await provider.respond(input)).answer, "Visitas culturales.");
    else await assert.rejects(provider.respond(input), { code: "AI_TEMPORARILY_BUSY" });
    assert.deepEqual(models, ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-lightning:free"].slice(0, successAt || 3));
    assert.equal(JSON.stringify(diagnostics).includes(marker), false);
  }
});

test("HU22 account/unknown limits never fallback and configuration rejects unapproved fallback", async () => {
  for (const source of ["openrouter_free_tier_per_minute", "openrouter_free_tier_daily", "unrecognized", undefined]) {
    let calls = 0;
    await assert.rejects(createOpenRouterProvider(env, { fetchImpl: async () => {
      calls++;
      return Response.json({ error: { metadata: { limit_source: source } } }, { status: 429 });
    } }).respond(input), { code: source === "openrouter_free_tier_daily" ? "AI_DAILY_CAPACITY" : "AI_TEMPORARILY_BUSY" });
    assert.equal(calls, 1);
  }
  for (const model of ["google/gemma-4-26b-a4b-it", "openrouter/free", "arbitrary:free"]) {
    let calls = 0;
    await assert.rejects(createOpenRouterProvider({ ...env, OPENROUTER_FALLBACK_MODEL: model }, { fetchImpl: () => { calls++; } }).respond(input),
      { code: "AI_PROVIDER_NOT_CONFIGURED" });
    assert.equal(calls, 0);
  }
});

test("HU22 OpenRouter: no context skips inference; client files do not import server secrets", async () => {
  let calls = 0;
  const result = await createOpenRouterProvider(env, { fetchImpl: () => { calls++; } }).respond({ ...input, context: [] });
  assert.equal(result.answer, DEFAULT_AI_CONFIG.mensaje_desconocido);
  assert.equal(calls, 0);
  const client = await readFile(new URL("../src/components/ai/AssistantProvider.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /OPENROUTER_|services\/ai/);
  assert.equal(JSON.stringify(getAIProviderStatus(env)).includes(marker), false);
  const admin = await readFile(new URL("../src/components/admin/ai/AIAdminPanel.jsx", import.meta.url), "utf8");
  assert.match(admin, /Gemma 4 31B vía OpenRouter/);
});

test("HU22 third model is blocked by non-upstream errors on fallback one and invalid configuration", async () => {
  for (const status of [400, 401, 402, 429, 500]) {
    let calls = 0;
    await assert.rejects(createOpenRouterProvider(env, { fetchImpl: async () => {
      calls++;
      return Response.json({ error: { metadata: { limit_source: calls === 1 ? "upstream_provider_shared_pool" : "openrouter_free_tier_daily" } } },
        { status: calls === 1 ? 429 : status });
    } }).respond(input));
    assert.equal(calls, 2);
  }
  for (const model of ["nvidia/nemotron-3.5-lightning", "openrouter/free", "other:free"]) {
    let calls = 0;
    await assert.rejects(createOpenRouterProvider({ ...env, OPENROUTER_FALLBACK_2_MODEL: model },
      { fetchImpl: () => { calls++; } }).respond(input), { code: "AI_PROVIDER_NOT_CONFIGURED" });
    assert.equal(calls, 0);
  }
});
