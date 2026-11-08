import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const swc = createRequire(import.meta.url)("next/dist/build/swc");
await swc.loadBindings();
globalThis.fetch = async () => { throw new Error("Network disabled"); };
const PRIMARY_KEYS = {
  inscripciones: "id_inscripcion",
  actividades: "id_actividad",
  contenidos: "id_contenido",
  museo_aportes: "id_aporte",
};
const CATALOGS = {
  estado_inscripcion: [
    { id_estado_inscripcion: 1, nombre_estado_inscripcion: "Confirmada" },
    { id_estado_inscripcion: 2, nombre_estado_inscripcion: "Lista de espera" },
    { id_estado_inscripcion: 3, nombre_estado_inscripcion: "Cancelada" },
  ],
};
const state = globalThis.__regressionTest = { rows: {}, missingCount: false, patches: [] };
function reset(rows = {}) {
  Object.assign(state, { rows: { ...CATALOGS, ...rows }, missingCount: false, patches: [] });
}
state.client = {
  from(table) {
    const filters = [];
    let single = false;
    const chain = {
      select() { return chain; }, eq(key, value) { filters.push((row) => row[key] === value); return chain; },
      neq(key, value) { filters.push((row) => row[key] !== value); return chain; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return chain; },
      gte(key, value) { filters.push((row) => row[key] >= value); return chain; },
      lt(key, value) { filters.push((row) => row[key] < value); return chain; },
      order() { return chain; }, range() { return chain; },
      maybeSingle() { single = true; return chain; }, single() { single = true; return chain; },
      ilike(key, value) {
        filters.push((row) => String(row[key] ?? "").toLowerCase() === String(value).toLowerCase());
        return chain;
      },
      insert(value) {
        const tableRows = state.rows[table] ?? (state.rows[table] = []);
        const pk = PRIMARY_KEYS[table] ?? "id";
        const row = {
          [pk]: Math.max(0, ...tableRows.map((item) => Number(item[pk]) || 0)) + 1,
          ...value,
        };
        if (table === "inscripciones") {
          row.fec_inscripcion ??= "2099-01-01T00:00:00Z";
          const estado = (state.rows.estado_inscripcion ?? []).find(
            (item) => item.id_estado_inscripcion === row.id_estado_inscripcion,
          );
          if (estado) {
            row.estado_inscripcion = { nombre_estado_inscripcion: estado.nombre_estado_inscripcion };
            row["estado_inscripcion.nombre_estado_inscripcion"] = estado.nombre_estado_inscripcion;
          }
        }
        tableRows.push(row);
        filters.length = 0;
        filters.push((item) => item[pk] === row[pk]);
        return chain;
      },
      delete() { return chain; },
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
      const path = [base + ".js", base + ".mjs", base + ".jsx", base].find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );
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
const viewFixture = {
  id: 1,
  titulo: "Actividad futura",
  descripcion: "Descripción",
  fecha: "2099-01-02",
  hora_inicio: "12:00",
  hora_fin: "13:00",
  estado: "Publicada",
  tipo_participacion: "Inscripción",
  modalidad: "Presencial",
  cupos: 0,
  cupos_espera: 0,
  informacion_adicional: null,
  imagen_url: null,
};
function activityRow(overrides = {}) {
  return {
    id_actividad: 1,
    titulo: "Actividad futura",
    descripcion: "Descripción",
    fecha: "2099-01-02",
    hora_inicio: "12:00",
    hora_fin: "13:00",
    cupos_max: 0,
    cupos_espera: 0,
    valor_monto: null,
    informacion_adicional: null,
    imagen_url: null,
    fec_creacion: "2099-01-01T00:00:00Z",
    id_modalidad: 1,
    id_tipo_participacion: 2,
    id_publico: 1,
    id_costo: 1,
    id_lugar: null,
    id_estado: 2,
    modalidad: { nombre_modalidad: "Presencial" },
    tipo_participacion: { nombre_tipo_participacion: "Inscripción" },
    publico_objetivo: { nombre_publico: "Todas las edades" },
    costo_actividad: { nombre_costo: "Gratuita" },
    estado_publicacion: { nombre_estado: "Publicada" },
    "estado_publicacion.nombre_estado": "Publicada",
    lugar: null,
    ...overrides,
  };
}
function inscripcionRow(overrides = {}) {
  return {
    id_inscripcion: 9,
    id_actividad: 1,
    nombre: "Ya",
    apellido: "Inscrita",
    correo: "ya@mail.cl",
    telefono: "912345678",
    fec_inscripcion: "2026-01-01T00:00:00Z",
    id_estado_inscripcion: 1,
    estado_inscripcion: { nombre_estado_inscripcion: "Confirmada" },
    "estado_inscripcion.nombre_estado_inscripcion": "Confirmada",
    ...overrides,
  };
}

test("Home loads real service results and links the upcoming activity, excluding drafts", async () => {
  reset({
    actividades: [
      activityRow(),
      activityRow({
        id_actividad: 2,
        titulo: "Borrador oculto",
        id_estado: 1,
        estado_publicacion: { nombre_estado: "Borrador" },
        "estado_publicacion.nombre_estado": "Borrador",
      }),
    ],
    contenidos: [],
  });
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
test("public activity detail preserves zero capacity and nullable additional information", async () => {
  reset({ actividades: [activityRow()] });
  const activity = await activities.getActividadById(1);
  assert.equal(activity.cupos, 0);
  assert.equal(activity.cupos_disponibles, 0);
  assert.equal(activity.informacion_adicional, null);
  state.rows.actividades[0].estado_publicacion = { nombre_estado: "Borrador" };
  state.rows.actividades[0]["estado_publicacion.nombre_estado"] = "Borrador";
  assert.equal(await activities.getActividadById(1), null);
});
test("public activity registration is unavailable when full, past or open participation", () => {
  const full = { cupos_disponibles: 0, lista_espera_disponibles: 0 };
  for (const extra of [full, { pasada: true }, { tipo_participacion: "Abierta" }]) {
    const html = renderToStaticMarkup(React.createElement(Activity, { activity: { ...viewFixture, cupos: 5, cupos_disponibles: 5, ...extra } }));
    if (extra.lista_espera_disponibles === 0) assert.match(html, /type="submit" disabled=""/);
    else assert.doesNotMatch(html, /name="nombre"/);
  }
});
test("public activity registration stays open on the waitlist", () => {
  const html = renderToStaticMarkup(React.createElement(Activity, {
    activity: {
      ...viewFixture,
      cupos: 5,
      cupos_disponibles: 0,
      lista_espera_disponibles: 15,
      tipo_participacion: "Inscripción",
    },
  }));
  assert.match(html, /name="nombre"/);
  assert.match(html, /lista de espera/i);
  assert.doesNotMatch(html, /type="submit" disabled=""/);
});
test("admin editing and quick publication preserve additional information and null place", async () => {
  reset({ actividades: [activityRow()] });
  const document = { type: "doc", content: [{ type: "paragraph" }] };
  await admin.saveActividadAdmin(1, {
    titulo: "Actividad futura",
    descripcion: "Descripción",
    fecha: "2099-01-02",
    hora_inicio: "12:00",
    hora_fin: "13:00",
    cupos_max: 0,
    cupos_espera: 0,
    valor_monto: null,
    informacion_adicional: document,
    imagen_url: null,
    id_modalidad: 1,
    id_tipo_participacion: 2,
    id_publico: 1,
    id_costo: 1,
    id_lugar: null,
    id_estado: 2,
  });
  await admin.saveActividadEstadoAdmin(1, 1);
  assert.equal(state.patches.at(-1).id_estado, 1);
  assert.equal(typeof state.patches.at(-1).fec_actualizacion, "string");
  assert.deepEqual(state.rows.actividades[0].informacion_adicional, document);
  assert.equal(state.rows.actividades[0].id_lugar, null);
});
test("registration errors propagate without simulated success", async () => {
  reset();
  assert.deepEqual(await admin.crearInscripcion(1, {}), { error: "ACTIVITY_UNAVAILABLE" });
  reset({
    actividades: [activityRow({
      tipo_participacion: { nombre_tipo_participacion: "Abierta" },
    })],
  });
  assert.deepEqual(await admin.crearInscripcion(1, {}), { error: "ACTIVITY_UNAVAILABLE" });
  reset({
    actividades: [activityRow({ fecha: "2000-01-01" })],
  });
  assert.deepEqual(await admin.crearInscripcion(1, {}), { error: "ACTIVITY_ENDED" });
});
test("the same email can occupy several places in one activity", async () => {
  reset({
    actividades: [activityRow({ cupos_max: 20, cupos_espera: 0 })],
    inscripciones: [inscripcionRow({ correo: "priscila@mail.cl" })],
  });
  const payload = {
    nombre: "Priscila",
    apellido: "Soto",
    email: "priscila@mail.cl",
    telefono: "+56912345678",
  };
  const second = await admin.crearInscripcion(1, payload);
  const third = await admin.crearInscripcion(1, payload);
  assert.equal(second.error, undefined);
  assert.equal(third.error, undefined);
  assert.equal(
    state.rows.inscripciones.filter((row) => row.correo === "priscila@mail.cl").length,
    3,
  );
});
test("waitlist places from cupos_espera are used when confirmed cupos are full", async () => {
  reset({
    actividades: [activityRow({ cupos_max: 1, cupos_espera: 15 })],
    inscripciones: [inscripcionRow()],
  });
  const result = await admin.crearInscripcion(1, {
    nombre: "Ana",
    apellido: "Perez",
    email: "ana@mail.com",
    telefono: "+56912345678",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.lista_espera, true);
});
test("public content detail filters drafts and preserves its document", async () => {
  const document = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Documento real" }] }] };
  reset({
    contenidos: [{
      id_contenido: 3,
      titulo: "Contenido",
      contenido: document,
      tipo_contenido: { nombre_tipo_contenido: "Noticia" },
      "estado_publicacion.nombre_estado": "Publicada",
    }],
  });
  assert.deepEqual((await contents.getContenidoById(3)).contenido, document);
  state.rows.contenidos[0]["estado_publicacion.nombre_estado"] = "Borrador";
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
test("public Museo only lists approved aportes and keeps their image", async () => {
  const image = "https://example.supabase.co/storage/v1/object/public/public-media/museo/aportes/12345678-1234-4123-8123-123456789abc.jpg";
  reset({
    categoria_museo: [{ id_categoria_museo: 1, nombre_categoria: "Documentos" }],
    museo_aportes: [
      {
        id_aporte: 1,
        titulo: "Plaza antigua",
        descripcion: "Una foto de la plaza",
        fecha_aproximada: "1950",
        lugar_referencia: "Plaza de Quilpué",
        imagen_url: image,
        categoria_museo: { nombre_categoria: "Documentos" },
        estado_revision: { nombre_estado_revision: "Aprobado" },
        "estado_revision.nombre_estado_revision": "Aprobado",
        nombre_aportante: "Ana",
        correo_aportante: "ana@correo.cl",
      },
      {
        id_aporte: 2,
        titulo: "Pieza oculta",
        imagen_url: image,
        estado_revision: { nombre_estado_revision: "Pendiente" },
        "estado_revision.nombre_estado_revision": "Pendiente",
      },
    ],
  });
  const page = await Museo();
  assert.equal(page.props.items.length, 1);
  assert.equal(page.props.items[0].title, "Plaza antigua");
  assert.equal(page.props.items[0].image, image);
  assert.equal(page.props.items[0].fileUrl, undefined);
  assert.equal(page.props.categorias[0].nombre, "Documentos");
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
