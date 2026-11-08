import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const swc = createRequire(import.meta.url)("next/dist/build/swc");
await swc.loadBindings();
globalThis.fetch = async () => { throw new Error("Network disabled"); };
const state = globalThis.__regressionTest = { rows: {}, missingCount: false, patches: [], rpcResult: { id: 1 } };
function reset(rows = {}) { Object.assign(state, { rows, missingCount: false, patches: [], rpcResult: { id: 1 } }); }
state.client = {
  rpc: async () => ({ data: state.rpcResult, error: null }),
  from(table) {
    const filters = [];
    let single = false;
    const chain = {
      select() { return chain; }, eq(key, value) { filters.push((row) => row[key] === value); return chain; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return chain; },
      gte(key, value) { filters.push((row) => row[key] >= value); return chain; },
      lt(key, value) { filters.push((row) => row[key] < value); return chain; },
      order() { return chain; }, range() { return chain; },
      maybeSingle() { single = true; return chain; }, single() { single = true; return chain; },
      update(value) { state.patches.push(value); Object.assign(state.rows[table][0], value); return chain; },
      then(done, fail) {
        const rows = (state.rows[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, count: state.missingCount ? null : rows.length, error: null }).then(done, fail);
      },
    };
    return chain;
  },
};
const mocks = {
  "server-only": "export {};",
  "next/navigation": "export function useRouter(){return {push(){},refresh(){}};} export function usePathname(){return '/';}",
  "next/server": "export async function connection(){}",
  "next/link": "import React from 'react'; export default function Link({children,...props}){return React.createElement('a',props,children);}",
  "next/image": "import React from 'react'; export default function Image(props){return React.createElement('img',{src:props.src,alt:props.alt});}",
  "@/lib/supabase/server": "export function getSupabaseServerClient(){return globalThis.__regressionTest.client;}",
  "@/lib/supabase/admin": "export function getSupabaseAdminClient(){return globalThis.__regressionTest.client;}",
};
const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(mocks, name)) return { url: "regression-mock:" + name, shortCircuit: true };
    let base;
    if (name.startsWith("@/")) base = resolve(root, "src", name.slice(2));
    else if (name.startsWith(".") && context.parentURL?.startsWith("file:")) base = fileURLToPath(new URL(name, context.parentURL));
    if (base) {
      const path = [base, base + ".js", base + ".mjs", base + ".jsx"].find(existsSync);
      if (path) return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    // Mock framework modules still resolve React from the checkout.
    return next(name, context.parentURL?.startsWith("regression-mock:") ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
    if (url.startsWith("regression-mock:")) return { format: "module", source: mocks[url.slice(16)], shortCircuit: true };
    if (url.startsWith("file:") && url.endsWith(".jsx")) return {
      format: "module", shortCircuit: true,
      source: swc.transformSync(readFileSync(fileURLToPath(url), "utf8"), {
        jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "es6" },
      }).code,
    };
    return next(url, context);
  },
});
const Home = (await import("../src/app/(sitio)/page.jsx")).default;
const Museo = (await import("../src/app/(sitio)/museo/page.jsx")).default;
const Dashboard = (await import("../src/app/admin/(panel)/dashboard-view.jsx")).default;
const Activity = (await import("../src/app/(sitio)/actividades/[id]/actividad-view.jsx")).default;
const Preview = (await import("../src/components/admin/contenidos/ContenidoPreviewDialog.jsx")).default;
const UserForm = (await import("../src/components/admin/usuarios/UsuarioFormModal.jsx")).default;
const { getAdminDashboardData } = await import("../src/services/admin-dashboard.service.js");
const activities = await import("../src/services/actividades.service.js");
const contents = await import("../src/services/contenido.service.js");
const admin = await import("../src/services/admin-community.service.js");
const fixture = { id: 1, titulo: "Actividad futura", descripcion: "Descripción", fecha: "2099-01-02", hora_inicio: "12:00", hora_fin: "13:00", estado: "publicada", tipo_participacion: "inscripcion", modalidad: "presencial", cupos: 0, forma_pago: null, informacion_adicional: null, imagen_url: null };

test("Home loads real service results and links the upcoming activity, excluding drafts", async () => {
  reset({ actividades: [fixture, { ...fixture, id: 2, titulo: "Borrador oculto", estado: "borrador" }], contenidos: [] });
  const html = renderToStaticMarkup(await Home());
  assert.match(html, /Actividad futura/);
  assert.match(html, /href="\/actividades\/1"/);
  assert.doesNotMatch(html, /Borrador oculto/);
});
test("empty Home renders without inventing a next activity", async () => {
  reset();
  const html = renderToStaticMarkup(await Home());
  assert.doesNotMatch(html, /href="\/actividades\/undefined"/);
});
test("public activity detail preserves zero capacity and nullable payment/document fields", async () => {
  reset({ actividades: [fixture] });
  const activity = await activities.getActividadById(1);
  assert.equal(activity.cupos, 0);
  assert.equal(activity.cupos_disponibles, 0);
  assert.equal(activity.forma_pago, null);
  assert.equal(activity.informacion_adicional, null);
  state.rows.actividades[0].estado = "borrador";
  assert.equal(await activities.getActividadById(1), null);
});
test("public activity registration is unavailable when full, past or open participation", () => {
  for (const extra of [{ cupos_disponibles: 0 }, { pasada: true }, { tipo_participacion: "abierta" }]) {
    const html = renderToStaticMarkup(React.createElement(Activity, { activity: { ...fixture, cupos: 5, cupos_disponibles: 5, ...extra } }));
    if (extra.cupos_disponibles === 0) assert.match(html, /type="submit" disabled=""/);
    else assert.doesNotMatch(html, /name="nombre"/);
  }
});
test("admin editing and quick publication preserve payment, additional information and nulls", async () => {
  reset({ actividades: [{ ...fixture }] });
  const document = { type: "doc", content: [{ type: "paragraph" }] };
  await admin.saveActividadAdmin(1, { forma_pago: "Transferencia", informacion_adicional: document, lugar: null });
  await admin.saveActividadEstadoAdmin(1, "borrador");
  assert.deepEqual(state.patches.at(-1), { estado: "borrador" });
  assert.equal(state.rows.actividades[0].forma_pago, "Transferencia");
  assert.deepEqual(state.rows.actividades[0].informacion_adicional, document);
  assert.equal(state.rows.actividades[0].lugar, null);
});
test("registration RPC results propagate without simulated success", async () => {
  for (const error of ["NO_PLACES", "ALREADY_REGISTERED", "ACTIVITY_ENDED", "ACTIVITY_UNAVAILABLE"]) {
    reset(); state.rpcResult = { error };
    assert.deepEqual(await admin.crearInscripcion(1, {}), { error });
  }
});
test("public content detail filters drafts and preserves its document", async () => {
  const document = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Documento real" }] }] };
  reset({ contenidos: [{ id: 3, titulo: "Contenido", estado: "publicada", contenido: document }] });
  assert.deepEqual((await contents.getContenidoById(3)).contenido, document);
  state.rows.contenidos[0].estado = "borrador";
  assert.equal(await contents.getContenidoById(3), null);
});
test("real preview and user form render valid named dialogs on the server", () => {
  const html = renderToStaticMarkup(React.createElement(Preview, {
    titulo: "Título de prueba", onClose() {},
    contenido: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Texto de documento" }] }] },
  }));
  assert.match(html, /<dialog/);
  assert.match(html, /aria-labelledby="vista-previa-titulo"/);
  assert.match(html, /Texto de documento/);
  assert.match(renderToStaticMarkup(React.createElement(UserForm, {
    mode: "create", roles: [{ codigo: "editor", nombre: "Editor" }], onClose() {}, onSubmit() {},
  })), /for="usuario-nombre"/);
});
test("public Museo preserves an original PDF and a legacy file without fabricating a cover", async () => {
  reset({ museo_piezas: [
    { id: 1, titulo: "Documento PDF", estado: "publicada", categoria: "documentos", archivo_nombre: "documento.pdf", archivo_url: "https://example.com/documento.pdf", imagen_url: null },
    { id: 2, titulo: "Archivo heredado", estado: "publicada", categoria: "documentos", archivo_nombre: "antiguo.pdf", archivo_url: null, imagen_url: null },
    { id: 3, titulo: "Pieza oculta", estado: "borrador" },
  ] });
  const page = await Museo();
  assert.equal(page.props.items.length, 2);
  assert.equal(page.props.items[0].fileUrl, "https://example.com/documento.pdf");
  assert.equal(page.props.items[0].image, null);
  assert.equal(page.props.items[1].fileName, "antiguo.pdf");
  assert.doesNotMatch(renderToStaticMarkup(page), /Pieza oculta/);
});
test("Dashboard real zero remains zero; missing exact counts cause an error, not fake metrics", async () => {
  reset();
  const data = await getAdminDashboardData();
  for (const key of ["totalContents", "publishedContents", "publishedActivities", "totalEnrollments", "publishedMuseumPieces"]) assert.equal(data[key], 0);
  assert.ok(data.monthlyEnrollments.every((item) => item.value === 0));
  const html = renderToStaticMarkup(React.createElement(Dashboard, { ...data, dateLabel: "Fecha de prueba" }));
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.match(html, />0</);
  state.missingCount = true;
  await assert.rejects(() => getAdminDashboardData(), /exact count/);
  const absent = renderToStaticMarkup(React.createElement(Dashboard, { contentError: "No disponible", dateLabel: "Fecha de prueba" }));
  assert.match(absent, /—/);
});
test.after(() => hooks.deregister());
