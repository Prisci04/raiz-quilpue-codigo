import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const browserPath = process.env.TEST_BROWSER_PATH ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium", "/usr/bin/google-chrome",
].find(existsSync);
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const liveGoogle = process.env.HU23_LIVE_GOOGLE === "1";
if (liveGoogle) require("@next/env").loadEnvConfig(root, true, { info() {}, error() {} });

// Only a test double: no credential, network or claims of live Google validation.
function installGoogleDouble() {
  window.hu23Maps = { maps: 0, markers: 0, removed: 0, widgets: 0, fields: [] };
  class PlaceAutocompleteElement extends HTMLElement {
    constructor() { super(); this.style.display = "block"; window.hu23Maps.widgets++; }
    connectedCallback() {
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Google simulado");
      input.style.cssText = "width:100%;min-height:44px;box-sizing:border-box";
      const suggestion = document.createElement("button");
      suggestion.type = "button"; suggestion.textContent = "Seleccionar sugerencia de prueba"; suggestion.hidden = true;
      const choose = () => {
        const event = new Event("gmp-select");
        event.placePrediction = { toPlace: () => new Place({ id: "selected-" + input.value }) };
        this.dispatchEvent(event); suggestion.hidden = true;
      };
      input.addEventListener("input", () => { suggestion.hidden = !input.value; });
      input.addEventListener("keydown", (event) => { if (event.key === "Enter" && input.value) { event.preventDefault(); choose(); } });
      suggestion.addEventListener("click", choose);
      this.append(input, suggestion);
    }
    set disabled(value) { this.querySelectorAll("input,button").forEach((node) => { node.disabled = value; }); }
  }
  class Place {
    constructor({ id }) { this.id = id; }
    async fetchFields({ fields }) {
      window.hu23Maps.fields.push(fields);
      this.formattedAddress = "Dirección Google temporal";
      this.location = { lat: -33.05, lng: -71.45 };
    }
  }
  customElements.define("gmp-place-autocomplete", PlaceAutocompleteElement);
  window.google = { maps: { importLibrary: async (name) => ({
    places: { PlaceAutocompleteElement, Place },
    maps: {
      Map: class { constructor(container) { window.hu23Maps.maps++; this.container = container; container.dataset.testMap = "true"; } },
    },
    core: { event: {
      clearInstanceListeners() { window.hu23Maps.removed++; },
      addListenerOnce(_map, _event, callback) { queueMicrotask(callback); },
    } },
    marker: { AdvancedMarkerElement: class { constructor({ map }) { this.map = map; window.hu23Maps.markers++; } } },
  })[name] } };
}

for (const mode of ["manual", "simulated", ...(liveGoogle ? ["live"] : [])]) {
const simulated = mode === "simulated";
const real = mode === "live";
test("HU-23 browser: " + (real ? "LIVE Google on local components, no Supabase" : simulated ? "simulated Google selection, maps, retry, virtual and schema error" : "manual entry, keyboard, save and responsive without Google"), {
  skip: (!browserPath && "No Chromium browser; set TEST_BROWSER_PATH")
    || (real && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() && "Live validation requires Maps configured; Embed is empty only in the isolated browser build"),
  timeout: real ? 120000 : 60000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), "rq-hu23-browser-"));
  let browser, server;
  try {
    // Bundle the actual components and existing editor, not a reproduction of the UI.
    await writeFile(join(temporary, "entry.jsx"), [
      'import React from "react";import {createRoot} from "react-dom/client";',
      'import Form from "@/components/admin/actividades/ActividadForm";',
      'import Public from "@/components/actividades/ActividadFicha";',
      'const activity={titulo:"Encuentro cultural",descripcion:"Actividad local de prueba",fecha:"2099-01-02",',
      'lugar:"",direccion:"",google_place_id:' + JSON.stringify(real ? null : "historical-test-place") + ',modalidad:"presencial",',
      'tipo_valor:"gratuito",tipo_participacion:"abierta",publico_objetivo:"todas_edades",estado:"borrador"};',
      'function Preview(){const [id,setId]=React.useState(activity.google_place_id);window.hu23PublicPlace=setId;return <div id="public"><Public activity={{...activity,google_place_id:id,lugar:"Centro cultural",direccion:"Dirección editorial "+"X".repeat(450)}}/></div>}',
      'const root=createRoot(document.getElementById("app"));window.hu23RenderForm=(editing)=>root.render(<><main className="admin-shell"><Form key={String(editing)} activityId={editing?"1":null} initialActivity={activity}/></main><Preview/></>);window.hu23RenderForm(false);',
    ].join("\n"));
    await writeFile(join(temporary, "navigation.js"), 'export function useRouter(){return {replace(path){window.navigated=path;},prefetch(){}};}');
    await writeFile(join(temporary, "link.jsx"), 'import React from "react";export default function Link({children,...props}){return <a {...props}>{children}</a>;}');
    await writeFile(join(temporary, "image.jsx"), 'import React from "react";export default function Image({src,alt}){return <img src={src} alt={alt}/>;}');
    await writeFile(join(temporary, "loader.cjs"), 'const swc=require(' + JSON.stringify(require.resolve("next/dist/build/swc")) + ');module.exports=async function(source){await swc.loadBindings();return swc.transformSync(source,{jsc:{parser:{syntax:"ecmascript",jsx:true},transform:{react:{runtime:"automatic"}}},module:{type:"es6"}}).code;};');
    const webpack = require("next/dist/compiled/webpack/webpack").webpack;
    await new Promise((done, reject) => {
      const compiler = webpack({
        mode: "development", devtool: false, context: root, entry: join(temporary, "entry.jsx"),
        output: { path: temporary, filename: "bundle.js" },
        resolve: { extensions: [".js", ".jsx", ".mjs"], modules: [join(root, "node_modules")], alias: {
          "@": join(root, "src"), "next/navigation$": join(temporary, "navigation.js"),
          "next/link$": join(temporary, "link.jsx"), "next/image$": join(temporary, "image.jsx"),
        } },
        module: { rules: [{ test: /\.jsx?$/, include: [join(root, "src"), temporary], use: join(temporary, "loader.cjs") }] },
        plugins: [new webpack.DefinePlugin({
          // Normal client compilation; never insert the credential into source fixtures or logs.
          "process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY": real ? JSON.stringify(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) : JSON.stringify(simulated ? "test-only" : ""),
          "process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY": '""',
        })],
      });
      compiler.run((error, stats) => {
        compiler.close(() => {
          if (error || stats.hasErrors()) reject(real ? new Error("Live browser bundle failed; details suppressed to protect configuration") : error ?? new Error(stats.toString({ all: false, errors: true })));
          else done();
        });
      });
    });
    const css = await require("postcss")([require("@tailwindcss/postcss")({ base: root })])
      .process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css") });
    const styles = css.css + "\n" + await readFile(join(root, "src/components/admin/admin-ui.css"), "utf8")
      + "\nbody{margin:0;font-family:sans-serif}.admin-shell{padding:24px;max-width:1100px;margin:auto}";
    const saves = [], external = [];
    let unavailable = simulated || real;
    server = createServer(async (req, res) => {
      if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(await readFile(join(temporary, "bundle.js"))); }
      else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(styles); }
      else if ((req.url === "/api/admin/actividades" && req.method === "POST") || (req.url === "/api/admin/actividades/1" && req.method === "PATCH")) {
        let body = ""; for await (const chunk of req) body += chunk;
        saves.push(JSON.parse(body));
        res.setHeader("Content-Type", "application/json");
        if (unavailable) {
          unavailable = false; res.statusCode = 503;
          res.end(JSON.stringify({ success: false, error: { code: "ACTIVIDAD_UBICACION_UNAVAILABLE", message: "La ubicación adicional todavía no está habilitada para guardarse." } }));
        } else res.end(JSON.stringify({ success: true, data: { ...saves.at(-1), id: 1 } }));
      } else if (req.url === "/") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HU23 QA local</title><link rel="stylesheet" href="/style.css"><div id="app"></div>'
          + (simulated ? '<script>(' + installGoogleDouble.toString() + ')()</script>' : '')
          + '<script defer src="/bundle.js"></script></html>');
      } else { res.statusCode = 404; res.end(); }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const origin = "http://127.0.0.1:" + server.address().port;
    browser = spawn(browserPath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--remote-debugging-pipe", "--user-data-dir=" + join(temporary, "profile"), "about:blank"], {
      windowsHide: true, stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"],
    });
    let sequence = 0, sessionId;
    const pending = new Map(), errors = [], liveCodes = new Set(), networkFailures = [];
    function send(method, params = {}) {
      return new Promise((done, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 5000);
        pending.set(id, { done: (value) => { clearTimeout(timer); done(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
        browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
      });
    }
    function receive(message) {
      if (message.id) {
        const waiting = pending.get(message.id); pending.delete(message.id);
        if (!waiting) return;
        if (message.error) waiting.reject(new Error(message.error.message)); else waiting.done(message.result);
      } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      else if (real && message.method === "Runtime.consoleAPICalled") {
        for (const argument of message.params.args ?? []) {
          const code = String(argument.value ?? "").match(/\b(InvalidKeyMapError|ExpiredKeyMapError|RefererNotAllowedMapError|ApiNotActivatedMapError|BillingNotEnabledMapError|ApiTargetBlockedMapError|OverQuotaMapError|REQUEST_DENIED)\b/);
          if (code) liveCodes.add(code[1]);
        }
      } else if (real && message.method === "Network.loadingFailed") {
        networkFailures.push({ type: message.params.type, error: message.params.errorText });
      }
      else if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const url = new URL(request.url);
        const local = request.url.startsWith(origin + "/");
        const google = real && url.protocol === "https:" && ["googleapis.com", "gstatic.com", "google.com"].some((host) => url.hostname === host || url.hostname.endsWith("." + host));
        if (!local && !google) external.push(real ? url.origin : request.url);
        void send(local || google ? "Fetch.continueRequest" : "Fetch.failRequest", local || google ? { requestId } : { requestId, errorReason: "BlockedByClient" });
      }
    }
    let buffer = "";
    browser.stdio[4].on("data", (chunk) => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf("\0")) !== -1) {
        const message = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (message) receive(JSON.parse(message));
      }
    });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(real ? "Live browser evaluation failed; details suppressed" : result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    }
    async function key(key, code) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, text: key === "Enter" ? "\r" : undefined, windowsVirtualKeyCode: code });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: code });
    }
    const targets = await send("Target.getTargets");
    sessionId = (await send("Target.attachToTarget", { targetId: targets.targetInfos.find((target) => target.type === "page").targetId, flatten: true })).sessionId;
    await send("Runtime.enable");
    if (real) await send("Network.enable");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await send("Page.navigate", { url: origin });
    await send("Page.bringToFront");
    for (let i = 0; i < 200 && !(await evaluate("Boolean(document.querySelector('input[name=lugar]'))")); i++) await pause(20);
    assert.equal(await evaluate("Boolean(document.querySelector('input[name=lugar]'))"), true);
    if (real) {
      async function waitFor(expression, message) {
        for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(100); }
        const state = await evaluate("({sdk:Boolean(window.google?.maps?.importLibrary),places:Boolean(window.google?.maps?.places?.PlaceAutocompleteElement),widgets:document.querySelectorAll('gmp-place-autocomplete').length,shadowInput:document.querySelector('gmp-place-autocomplete')?.shadowRoot?.querySelector('input')?.value,options:document.querySelector('gmp-place-autocomplete')?.shadowRoot?.querySelectorAll('[role=option]').length,status:[...document.querySelectorAll('[role=status]')].map(e=>e.textContent)})");
        const capture = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(tmpdir(), "rq-hu23-live.png"), Buffer.from(capture.data, "base64"));
        throw new Error(message + "; " + JSON.stringify({ state, codes: [...liveCodes], networkFailures, exceptionCount: errors.length }));
      }
      for (const [index, width] of [1440, 1024, 390].entries()) {
        if (index === 1) {
          await evaluate("window.hu23RenderForm(true)");
          await pause(150);
        }
        await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
        if (index < 2) {
          await waitFor("Boolean(document.querySelector('input[name=lugar]'))", "Editing form did not render");
          await evaluate("document.querySelector('input[name=lugar]').focus()");
          await send("Input.insertText", { text: "Centro cultural propio" });
          await key("Tab", 9);
          await send("Input.insertText", { text: "Dirección editorial propia, Quilpué" });
        }
        await evaluate("[...document.querySelectorAll('.admin-shell button')].find(e=>/^(Buscar en Google Maps|Cambiar ubicación)$/.test(e.textContent))?.click()");
        await waitFor("Boolean(document.querySelector('gmp-place-autocomplete'))", "Live autocomplete did not initialize");
        await evaluate("document.querySelector('gmp-place-autocomplete').scrollIntoView({block:'center'})");
        const rect = await evaluate("(()=>{const r=document.querySelector('gmp-place-autocomplete').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
        await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...rect });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...rect });
        if (index === 2) {
          await send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
          await send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
        }
        await send("Input.insertText", { text: index === 2 ? "Municipalidad de Quilpué" : "Plaza de Armas Quilpué" });
        let suggestions = [];
        for (let attempt = 0; attempt < 100; attempt++) {
          const tree = await send("Accessibility.getFullAXTree");
          const byId = new Map(tree.nodes.map((node) => [node.nodeId, node]));
          suggestions = tree.nodes.filter((node) => {
            if (node.role?.value !== "option" || node.ignored) return false;
            let parent = byId.get(node.parentId);
            while (parent) {
              if (parent.role?.value === "listbox") return true;
              parent = byId.get(parent.parentId);
            }
            return false; // Native select options are not Google predictions.
          });
          if (suggestions.length) break;
          await pause(100);
        }
        const suggestionCapture = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(tmpdir(), "rq-hu23-suggestions.png"), Buffer.from(suggestionCapture.data, "base64"));
        assert.ok(suggestions.length, "Live Google did not expose any accessible suggestions");
        await key("ArrowDown", 40); await pause(150); await key("Enter", 13);
        await waitFor("document.body.textContent.includes('Dirección de Google Maps, temporal:')", "Live suggestion selection did not resolve a place");
        await waitFor("Boolean(document.querySelector('.admin-shell .gm-style'))&&!document.body.textContent.includes('Cargando mapa')", "Live map did not render");
        assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true, "Live viewport overflow");
        await waitFor("Boolean(document.querySelector('.admin-shell gmp-advanced-marker,.admin-shell [title=\"Ubicación de la actividad\"],.admin-shell [aria-label=\"Ubicación de la actividad\"]'))", "Live advanced marker absent");
        const capture = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(tmpdir(), "rq-hu23-live-" + width + ".png"), Buffer.from(capture.data, "base64"));
        assert.equal(saves.length, index ? 1 : 0, "Suggestion Enter must not submit");
        if (index === 0) {
          await evaluate("document.querySelector('form').requestSubmit()");
          await waitFor("document.body.textContent.includes('todavía no está habilitada para guardarse')", "Schema error feedback absent");
          assert.ok(saves[0].google_place_id);
          assert.equal(saves[0].direccion, "Dirección editorial propia, Quilpué");
          await evaluate("window.hu23PublicPlace(" + JSON.stringify(saves[0].google_place_id) + ")");
          await waitFor("Boolean(document.querySelector('#public .gm-style'))", "Live public map did not render");
        }
      }
      await evaluate("(()=>{const s=[...document.querySelectorAll('.admin-shell select')].find(e=>[...e.options].some(o=>o.value==='virtual'));s.value='virtual';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await pause(100);
      assert.equal(await evaluate("document.querySelectorAll('.admin-shell [role=region],.admin-shell a[href*=google]').length"), 0);
      await evaluate("[...document.querySelectorAll('.admin-shell button')].find(e=>e.textContent==='Quitar referencia Google').click()");
      await pause(100);
      assert.equal(await evaluate("document.querySelector('input[name=lugar]').value"), "Centro cultural propio");
      assert.equal(await evaluate("document.querySelector('input[name=direccion]').value"), "Dirección editorial propia, Quilpué");
      await evaluate("document.querySelector('form').requestSubmit()");
      await pause(150);
      assert.equal(saves.at(-1).google_place_id, null);
      assert.equal(Object.hasOwn(saves.at(-1), "location"), false);
      assert.deepEqual(external, []);
      sessionId = undefined; await send("Browser.close");
      return;
    }
    for (const width of [1440, 1024, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, "overflow at " + width);
      assert.equal(await evaluate("document.querySelectorAll('iframe,script[src*=maps]').length"), 0);
      assert.equal(await evaluate("document.body.textContent.includes('Google Maps todavía no está configurado')"), !simulated);
      assert.equal(await evaluate("[...document.querySelectorAll('input[name=lugar],input[name=direccion]')].every(e=>e.labels.length&&e.getBoundingClientRect().height>=44)"), true);
      await evaluate("document.querySelector('input[name=lugar]').focus()");
      await key("Tab", 9);
      assert.equal(await evaluate("document.activeElement.name"), "direccion");
      assert.equal(await evaluate("getComputedStyle(document.activeElement).outlineStyle!=='none'"), true);
      assert.equal(await evaluate("[...document.querySelectorAll('#public a[href*=maps]')].every(e=>e.getBoundingClientRect().width<=innerWidth&&e.getBoundingClientRect().height>=44)"), true);
    }
    await evaluate("document.querySelector('input[name=lugar]').focus()");
    await send("Input.insertText", { text: "Centro cultural propio" });
    await key("Tab", 9);
    await send("Input.insertText", { text: "Av. Los Carrera 100, Quilpué" });
    assert.equal(await evaluate("document.querySelector('input[name=direccion]').value"), "Av. Los Carrera 100, Quilpué");
    if (simulated) {
      const click = async (label) => {
        await evaluate("[...document.querySelectorAll('.admin-shell button')].find(e=>e.textContent===" + JSON.stringify(label) + ").click()");
        await pause(50);
      };
      await click("Cambiar ubicación");
      for (let i = 0; i < 100 && !(await evaluate("Boolean(document.querySelector('gmp-place-autocomplete input'))")); i++) await pause(20);
      assert.equal(await evaluate("Boolean(document.querySelector('gmp-place-autocomplete input'))"), true,
        await evaluate("[...document.querySelectorAll('[role=status]')].map(e=>e.textContent).join(';')"));
      for (const width of [1440, 1024, 390]) {
        await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
        await evaluate("document.querySelector('gmp-place-autocomplete input').focus()");
        await send("Input.insertText", { text: "Quilpue" });
        assert.equal(await evaluate("document.querySelector('gmp-place-autocomplete button').hidden"), false);
        assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
        await key("Enter", 13);
        await pause(80);
        assert.equal(saves.length, 0, "Enter selects a suggestion without submitting the activity");
        assert.equal(await evaluate("document.querySelectorAll('.admin-shell [data-test-map]').length"), 1);
        assert.equal(await evaluate("document.querySelectorAll('#public [data-test-map]').length"), 1);
        assert.equal(await evaluate("document.body.textContent.includes('Dirección Google temporal')"), true);
      }
      assert.equal(await evaluate("document.querySelector('input[name=direccion]').value"), "Av. Los Carrera 100, Quilpué");
      await send("Input.insertText", { text: " nueva búsqueda" });
      await pause(80);
      assert.equal(await evaluate("document.querySelectorAll('.admin-shell [role=region]').length"), 0);
      await key("Enter", 13); await pause(80);
      await evaluate("document.querySelector('gmp-place-autocomplete').dispatchEvent(new Event('gmp-error'))");
      await pause(60);
      assert.equal(await evaluate("document.querySelectorAll('.admin-shell [role=region]').length"), 0);
      await click("Reintentar búsqueda");
      assert.equal(await evaluate("window.hu23Maps.widgets"), 2);
      await evaluate("document.querySelector('gmp-place-autocomplete input').focus()");
      await send("Input.insertText", { text: "Museo" }); await key("Enter", 13); await pause(80);
      await evaluate("window.gm_authFailure()"); await pause(60);
      assert.equal(await evaluate("document.body.textContent.includes('No se pudo mostrar el mapa')"), true);
      await click("Reintentar mapa");
      assert.equal(await evaluate("document.querySelectorAll('.admin-shell [data-test-map]').length"), 1);
      await evaluate("(()=>{const s=[...document.querySelectorAll('.admin-shell select')].find(e=>[...e.options].some(o=>o.value==='virtual'));s.value='virtual';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await pause(60);
      assert.equal(await evaluate("document.querySelectorAll('.admin-shell [role=region],.admin-shell a[href*=google]').length"), 0);
      await evaluate("(()=>{const s=[...document.querySelectorAll('.admin-shell select')].find(e=>[...e.options].some(o=>o.value==='virtual'));s.value='presencial';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await pause(80);
      await evaluate("document.querySelector('form').requestSubmit()"); await pause(100);
      assert.equal(saves.length, 1);
      assert.ok(saves[0].google_place_id.startsWith("selected-"));
      assert.equal(saves[0].direccion, "Av. Los Carrera 100, Quilpué");
      assert.equal(Object.hasOwn(saves[0], "location"), false);
      assert.equal(await evaluate("document.body.textContent.includes('todavía no está habilitada para guardarse')"), true);
      assert.equal(await evaluate("document.body.textContent.includes('Quitar referencia Google')"), true);
      assert.ok(await evaluate("window.hu23Maps.removed>0"));
    }
    await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='Quitar referencia Google').focus()");
    await key("Enter", 13);
    assert.equal(await evaluate("document.querySelector('input[name=lugar]').value"), "Centro cultural propio");
    assert.equal(await evaluate("document.body.textContent.includes('Quitar referencia Google')"), false);
    await evaluate("document.querySelector('button[type=submit]').focus()");
    await key("Enter", 13);
    for (let i = 0; i < 100 && saves.length < (simulated ? 2 : 1); i++) await pause(20);
    assert.equal(saves.length, simulated ? 2 : 1);
    assert.equal(saves.at(-1).lugar, "Centro cultural propio");
    assert.equal(saves.at(-1).direccion, "Av. Los Carrera 100, Quilpué");
    assert.equal(saves.at(-1).google_place_id, null);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    sessionId = undefined;
    await send("Browser.close");
  } finally {
    if (browser && browser.exitCode === null) browser.kill();
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    // Verify resolved scope before recursive temporary cleanup on Windows.
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(basename(temporary).startsWith("rq-hu23-browser-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
}
