import assert from "node:assert/strict";
import { registerHooks, createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

globalThis.fetch = async () => { throw new Error("Network disabled"); };
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
    if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
    if (url.endsWith(".jsx")) return {
      format: "module", shortCircuit: true,
      source: swc.transformSync(readFileSync(fileURLToPath(url), "utf8"), {
        jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "es6" },
      }).code,
    };
    return next(url, context);
  },
});
const Field = (await import("../src/components/admin/actividades/ActividadUbicacionField.jsx")).default;
const Form = (await import("../src/components/admin/actividades/ActividadForm.jsx")).default;
const Public = (await import("../src/components/actividades/ActividadFicha.jsx")).default;
const Detail = (await import("../src/components/admin/actividades/ActividadDetallePanel.jsx")).default;
const MapView = (await import("../src/components/maps/OpenStreetMapMap.jsx")).default;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const activity = { id: 1, titulo: "Encuentro cultural", descripcion: "Descripción", modalidad: "presencial", lugar: "Recinto histórico", fecha: "2099-01-02",
  tipo_valor: "gratuito", tipo_participacion: "abierta", estado: "publicada", publico_objetivo: "todas_edades" };

test("admin retains manual labels and explicit search without configuration or credentials", () => {
  const html = render(Form, { activityId: 1, initialActivity: { ...activity, direccion: "Calle propia 20" } });
  // Catalogs load on the client; explicit search is exercised below and in browser.
  assert.match(html, /name="direccion"/); assert.match(html, /value="Calle propia 20"/);
  const inputs = html.match(/<input\b[^>]*>/g);
  for (const name of ["direccion"]) {
    const field = inputs.find((input) => input.includes('name="' + name + '"'));
    const id = field.match(/id="([^"]+)"/)[1]; assert.ok(html.includes('for="' + id + '"'));
    if (name === "lugar") assert.match(field, /required/); else assert.doesNotMatch(field, /required/);
  }
  assert.match(html, /Seleccionar lugar/);
  const inherited = render(Form, { initialActivity: { ...activity, direccion: "Dirección compartida", direccion_evento: null } });
  assert.doesNotMatch(inherited, /value="Dirección compartida"/);
  const manual=render(Field,{value:activity,onChange(){}}); assert.match(manual,/name="lugar"/); assert.match(manual,/Buscar ubicación/); assert.match(manual,/Seleccionar en el mapa/);
  assert.doesNotMatch(html, /<iframe|maps\.googleapis|API key|PlaceAutocomplete/);
});
test("presencial and hibrida preview coordinates with an accessible Leaflet placeholder and external links", () => {
  for (const modalidad of ["presencial", "hibrida"]) {
    const value = { ...activity, modalidad, latitud: -33.05, longitud: -71.45, direccion: "Dirección editorial" };
    for (const html of [render(Public, { activity: value }), render(Field, { value, onChange() {} }), render(Detail, { activity: value })]) {
      assert.match(html, /OpenStreetMap/); assert.match(html, /Cargando mapa/);
      assert.match(html, /Cómo llegar/); assert.match(html, /Abrir en Google Maps/);
      assert.doesNotMatch(html, /<iframe|maps\.googleapis/);
    }
  }
});
test("legacy-only locations remain useful as text and links, with no automatic provider lookup", () => {
  const html = render(Public, { activity: { ...activity, google_place_id: "opaque-legacy" } });
  assert.match(html, /Recinto histórico/); assert.match(html, /Cómo llegar/);
  assert.doesNotMatch(html, /opaque-legacy|Cargando mapa|<iframe/);
  assert.equal(render(MapView, {}), "");
});
test("virtual suppresses physical search, maps and navigation while preserving historical editor inputs", () => {
  const value = { ...activity, modalidad: "virtual", direccion: "Histórica", google_place_id: "legacy", latitud: -33, longitud: -71 };
  for (const html of [render(Field, { value, onChange() {} }), render(Public, { activity: value }), render(Detail, { activity: value })]) {
    assert.doesNotMatch(html, /Buscar ubicación|Seleccionar en el mapa|Cargando mapa|Cómo llegar|Abrir en Google Maps|google.com\/maps/);
  }
});
test("admin selected point can be changed/cleared; disabled controls stay disabled", () => {
  const html = render(Field, { value: { ...activity, latitud: 0, longitud: 0 }, disabled: true, onChange() {} });
  assert.match(html, /Ubicación seleccionada/); assert.match(html, /Cambiar ubicación/); assert.match(html, /Quitar coordenadas/);
  assert.match(html, /disabled=""/); assert.match(html, /0\.000000/);
});
test.after(() => hooks.deregister());
