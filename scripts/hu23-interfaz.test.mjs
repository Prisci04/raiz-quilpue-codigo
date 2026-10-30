import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

globalThis.fetch = async () => { throw new Error("Network disabled"); };
delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
const root = fileURLToPath(new URL("../", import.meta.url));
const swc = createRequire(import.meta.url)("next/dist/build/swc");
await swc.loadBindings();
const mocks = {
  "next/navigation": "export function useRouter(){return {push(){},refresh(){},prefetch(){}};}",
  "next/link": "import React from 'react'; export default function Link({children,...props}){return React.createElement('a',props,children);}",
  "next/image": "import React from 'react'; export default function Image({src,alt}){return React.createElement('img',{src,alt});}",
};
const hooks = registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(mocks, name)) return { url: "hu23-ui:" + name, shortCircuit: true };
    let base;
    if (name.startsWith("@/")) base = resolve(root, "src", name.slice(2));
    else if (name.startsWith(".") && context.parentURL?.startsWith("file:")) base = fileURLToPath(new URL(name, context.parentURL));
    if (base) {
      const path = [base, base + ".js", base + ".mjs", base + ".jsx"].find(existsSync);
      if (path) return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    return next(name, context.parentURL?.startsWith("hu23-ui:") ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith("hu23-ui:")) return { format: "module", source: mocks[url.slice(8)], shortCircuit: true };
    if (url.endsWith(".jsx")) return {
      format: "module", shortCircuit: true,
      source: swc.transformSync(readFileSync(fileURLToPath(url), "utf8"), {
        jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "es6" },
      }).code,
    };
    return next(url, context);
  },
});
const Embed = (await import("../src/components/maps/GoogleMapsEmbed.jsx")).default;
const Field = (await import("../src/components/admin/actividades/ActividadUbicacionField.jsx")).default;
const Form = (await import("../src/components/admin/actividades/ActividadForm.jsx")).default;
const Public = (await import("../src/components/actividades/ActividadFicha.jsx")).default;
const Detail = (await import("../src/components/admin/actividades/ActividadDetallePanel.jsx")).default;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const activity = {
  id: 1, titulo: "Encuentro cultural", descripcion: "Descripción", modalidad: "presencial",
  lugar: "Recinto histórico", fecha: "2099-01-02", hora_inicio: "12:00", hora_fin: "13:00",
  tipo_valor: "gratuito", tipo_participacion: "abierta", estado: "publicada", publico_objetivo: "todas_edades",
};

test("Embed renders nothing without key or Place ID and emits a lazy named iframe only with both", () => {
  assert.equal(render(Embed, { placeId: "test-place" }), "");
  assert.equal(render(Embed, { apiKey: "test-only", placeId: null }), "");
  const html = render(Embed, { apiKey: "test-only", placeId: "id &?/", direccion: "Dirección propia" });
  assert.match(html, /<iframe/);
  assert.match(html, /title="Mapa de ubicación: Dirección propia"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(html, /q=place_id%3Aid\+%26%3F%2F/);
  assert.doesNotMatch(html, /maps\/api\/js/);
});
test("admin no-key state retains named manual inputs, optional address and usable submit actions", () => {
  const html = render(Form, { activityId: 1, initialActivity: { ...activity, direccion: "Calle propia 20" } });
  assert.match(html, /Google Maps todavía no está configurado/);
  const inputs = html.match(/<input\b[^>]*>/g);
  const lugar = inputs.find((input) => input.includes('name="lugar"'));
  const direccion = inputs.find((input) => input.includes('name="direccion"'));
  assert.match(lugar, /required=""/);
  assert.match(direccion, /maxLength="500"/);
  assert.match(direccion, /value="Calle propia 20"/);
  assert.match(html, /type="submit"/);
  assert.doesNotMatch(html, /<iframe|maps\/api\/js/);
  assert.doesNotMatch(direccion, /required/);
  for (const name of ["lugar", "direccion"]) {
    const id = inputs.find((input) => input.includes('name="' + name + '"')).match(/id="([^"]+)"/)?.[1];
    assert.ok(id);
    assert.ok(html.includes('for="' + id + '"'));
  }
});
test("admin preserves virtual reference explicitly, disables controls while saving and never shows a map", () => {
  const html = render(Field, { value: { ...activity, modalidad: "virtual", google_place_id: "existing-place" }, disabled: true, onChange() {} });
  assert.match(html, /Quitar referencia Google/);
  assert.match(html, /sin uso en esta modalidad/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /<iframe|name="lugar" required/);
});
test("public legacy and manual address remain useful without keys or technical error messages", () => {
  const legacy = render(Public, { activity, backHref: "/actividades", backLabel: "Volver" });
  assert.match(legacy, /Recinto histórico/);
  assert.match(legacy, /Cómo llegar/);
  assert.doesNotMatch(legacy, /<iframe|no está configurado|API key|Google Maps todavía/);
  const manual = render(Public, { activity: { ...activity, direccion: "Dirección editorial" } });
  assert.match(manual, /Dirección editorial/);
  assert.match(manual, /Abrir en Google Maps/);
  assert.doesNotMatch(manual, /<iframe/);
});
test("public Place ID produces links without keys and a discrete Embed when configured", () => {
  const value = { ...activity, direccion: "Calle propia 20", google_place_id: "test-place" };
  assert.doesNotMatch(render(Public, { activity: value }), /<iframe/);
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "test-only";
  try {
    const html = render(Public, { activity: value });
    assert.match(html, /<iframe/);
    assert.match(html, /Calle propia 20/);
    assert.match(html, /destination_place_id=test-place/);
    assert.match(html, /query_place_id=test-place/);
    assert.match(html, /rel="noopener noreferrer"/);
  } finally { delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY; }
});
test("public virtual suppresses physical address block, all Maps links and iframe even with a key and historical ID", () => {
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "test-only";
  try {
    const html = render(Public, { activity: { ...activity, modalidad: "virtual", direccion: "Texto histórico", google_place_id: "test-place" } });
    assert.match(html, /Recinto histórico/);
    assert.doesNotMatch(html, /<iframe|Cómo llegar|Abrir en Google Maps|google.com\/maps|Texto histórico/);
  } finally { delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY; }
});

test("Maps-only configuration renders an accessible JavaScript map placeholder in admin and public", () => {
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-only";
  try {
    for (const modalidad of ["presencial", "hibrida"]) {
      const value = { ...activity, modalidad, direccion: "Calle propia 20", google_place_id: "test-place" };
      for (const html of [render(Public, { activity: value }), render(Field, { value, onChange() {} })]) {
        assert.match(html, /role="region" aria-label="Mapa de ubicación: Calle propia 20"/);
        assert.match(html, /Cargando mapa/);
        assert.match(html, /Cómo llegar/);
        assert.doesNotMatch(html, /<iframe/);
      }
    }
    const virtual = render(Public, { activity: { ...activity, modalidad: "virtual", direccion: "Histórica", google_place_id: "old" } });
    assert.doesNotMatch(virtual, /Cargando mapa|Mapa de ubicación|Cómo llegar|Abrir en Google Maps/);
    assert.doesNotMatch(render(Public, { activity }), /Cargando mapa|Mapa de ubicación/);
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = "test-only";
    const preferred = render(Public, { activity: { ...activity, google_place_id: "test-place" } });
    assert.match(preferred, /<iframe/);
    assert.doesNotMatch(preferred, /Cargando mapa/);
  } finally {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  }
});
test("admin detail shows editorial address and integration state without exposing keys or opaque IDs", () => {
  const html = render(Detail, { activity: { ...activity, direccion: "Calle propia 20", google_place_id: "opaque-test-id" } });
  assert.match(html, /Calle propia 20/);
  assert.match(html, /Referencia guardada/);
  assert.doesNotMatch(html, /<iframe|opaque-test-id/);
  assert.match(render(Detail, { activity }), /Sin referencia Google/);
});
test.after(() => hooks.deregister());
