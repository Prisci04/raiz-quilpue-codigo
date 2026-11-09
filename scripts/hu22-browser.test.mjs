import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { hu22Modules } from "./helpers/hu22-modules.mjs";
import { browserPath, bundleFixture, openBrowser, pause } from "./helpers/visual-browser.mjs";
import { DEFAULT_AI_CONFIG } from "../src/lib/ai/contracts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
test("HU22 Chromium: actual Admin CRUD, preview, public chat, shared widget, keyboard, errors and 1440/1024/390", {
  skip: !browserPath && "No Chromium; set TEST_BROWSER_PATH", timeout: 120000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), "rq-hu22-browser-"));
  let server, browser, hooks;
  const state = globalThis.__hu22Browser = {};
  try {
    hooks = await hu22Modules({
      "@/lib/auth/guard": "export async function requireGestorContenido(){return {user:{id:1},response:null}}",
      "@/services/ai/repository": "export function getAIRepository(){return globalThis.__hu22Browser.store}export async function getAIConfig(){return getAIRepository().getConfig()}",
      "@/services/ai/public-context": 'export async function searchPublicContext(){return [{titulo:"Visitas culturales",contenido:"Explora las actividades culturales del territorio.",href:"/actividades/1"}]}',
    });
    const { createLocalAIStore } = await import("../src/services/ai/local-store.mjs");
    state.store = createLocalAIStore(join(temporary, "data"));
    await state.store.saveConfig(DEFAULT_AI_CONFIG);
    await state.store.saveKnowledge(null, { titulo: "Visitas al archivo", categoria: "Visitas", contenido: "Las visitas al archivo se coordinan con la corporación.", orden: 0, activo: true });
    const routes = {
      "/api/ia/chat": await import("../src/app/api/ia/chat/route.js"),
      "/api/ia/configuracion": await import("../src/app/api/ia/configuracion/route.js"),
      "/api/admin/ia/configuracion": await import("../src/app/api/admin/ia/configuracion/route.js"),
      "/api/admin/ia/conocimiento": await import("../src/app/api/admin/ia/conocimiento/route.js"),
      "/api/admin/ia/probar": await import("../src/app/api/admin/ia/probar/route.js"),
    };
    const detail = await import("../src/app/api/admin/ia/conocimiento/[id]/route.js");
    await bundleFixture(root, temporary, `
      import React from "react";import {createRoot} from "react-dom/client";
      import {AssistantProvider} from "@/components/ai/AssistantProvider";
      import Widget from "@/components/ai/AssistantWidget";import Page from "@/app/(sitio)/asistente/page";
      import Admin from "@/components/admin/ai/AIAdminPanel";import Shell from "@/components/admin/AdminShell";
      import Header from "@/components/Header";import Footer from "@/components/Footer";
      function App(){const [path,setPath]=React.useState('/');window.qaNavigate=(next)=>{window.qaPath=next;history.pushState({},'',next);setPath(next)};return path==='/admin/ia'?<Shell displayName="Gestión local" email="qa@example.test" isAdministrador><Admin/></Shell>:<div className="min-h-screen pt-16 pb-20"><Header/>{path==='/asistente'?<Page/>:<main style={{minHeight:1200,padding:24}}><h1>Raíz Quilpué</h1><p>Vista pública para revisar el asistente.</p><a href="/asistente">Conversar con el asistente</a></main>}<Footer/><Widget/></div>}
      createRoot(document.getElementById('app')).render(<AssistantProvider><App/></AssistantProvider>);
      document.addEventListener('click',event=>{const link=event.target.closest('a');if(link?.getAttribute('href')==='/asistente'){event.preventDefault();window.qaNavigate('/asistente')}});
    `);
    const css = await require("postcss")([require("@tailwindcss/postcss")({ base: root })])
      .process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css") });
    const styles = css.css + await readFile(join(root, "src/components/ai/assistant.css"), "utf8")
      + await readFile(join(root, "src/components/admin/admin-ui.css"), "utf8")
      + '@font-face{font-family:Raiz;src:url(/raiz.otf)}:root{--font-raiz-local:Raiz;--font-poppins:Arial}body{margin:0}';
    let failNext = false, apiSequence = 0, chatHold = null;
    server = createServer(async (req, res) => {
      const path = new URL(req.url, "http://localhost").pathname;
      try {
        if (path.startsWith("/api/")) {
          if ((path.endsWith("/chat") || path.endsWith("/probar")) && chatHold) await chatHold.promise;
          if (failNext && path === "/api/ia/chat") { failNext = false; res.statusCode = 503; res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ success: false, error: { message: "Prueba de conexión no disponible." } })); return; }
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const request = new Request("http://" + req.headers.host + path, { method: req.method,
            headers: { ...req.headers, "x-forwarded-for": String(++apiSequence) },
            ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
          });
          const id = path.startsWith("/api/admin/ia/conocimiento/") ? path.split("/").at(-1) : null;
          const handler = (id ? detail : routes[path])?.[req.method];
          const response = handler ? await handler(request, { params: Promise.resolve({ id }) }) : new Response(null, { status: 404 });
          res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
        } else if (path === "/bundle.js") { res.setHeader("content-type", "text/javascript"); res.end(await readFile(join(temporary, "bundle.js"))); }
        else if (path === "/style.css") { res.setHeader("content-type", "text/css"); res.end(styles); }
        else if (path === "/raiz.otf") res.end(await readFile(join(root, "src/app/fonts/TipografiaRaiz-Regular.otf")));
        else if (path.startsWith("/images/")) { res.statusCode = 404; res.end(); }
        else { res.setHeader("content-type", "text/html; charset=utf-8"); res.end('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app"></div><script defer src="/bundle.js"></script></html>'); }
      } catch { res.statusCode = 500; res.end("Fixture failure"); }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const qa = await openBrowser(temporary, "http://127.0.0.1:" + server.address().port);
    browser = qa.browser;
    const { send, evaluate, waitFor } = qa;
    const click = async (selector) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await pause(30); };
    async function fill(selector, value) {
      await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    }
    async function ask(selector, value = "visitas", keyboard = false) {
      await waitFor(`document.querySelector(${JSON.stringify(selector + " textarea")}) && !document.querySelector(${JSON.stringify(selector + " textarea")}).disabled`);
      await fill(selector + " textarea", value);
      await waitFor(`!document.querySelector(${JSON.stringify(selector + " button[type=submit]")}).disabled`);
      const hold = {};
      hold.promise = new Promise((done) => { hold.release = done; });
      chatHold = hold;
      try {
        if (keyboard) {
          await evaluate(`document.querySelector(${JSON.stringify(selector + " textarea")}).focus()`);
          await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", text: "\r", windowsVirtualKeyCode: 13 });
          await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", windowsVirtualKeyCode: 13 });
        } else await click(selector + " button[type=submit]");
        await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector + " [role=status]")}))`);
        hold.release(); chatHold = null;
        await waitFor(`!document.querySelector(${JSON.stringify(selector + " [role=status]")})`);
      } finally { hold.release(); chatHold = null; }
    }
    async function capture(name, width) {
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true, name + " overflow " + width);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(tmpdir(), `rq-hu22-${name}-${width}.png`), Buffer.from(shot.data, "base64"));
    }
    await waitFor("Boolean(document.querySelector('[aria-label=\"Abrir asistente\"]'))");
    for (const width of [1440, 1024, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
      await evaluate("window.qaNavigate('/');window.scrollTo(0,0)"); await pause(100);
      await click('[aria-label="Abrir asistente"]');
      await waitFor("document.activeElement.tagName==='TEXTAREA' && !document.activeElement.disabled");
      await ask(".ai-widget", "visitas", true);
      await waitFor("document.querySelector('.ai-widget [role=log]').textContent.includes('se coordinan')");
      const geometry = await evaluate("(()=>{const r=document.querySelector('.ai-widget-panel').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()");
      assert.ok(geometry.left >= 0 && geometry.right <= width && geometry.top >= 0 && geometry.bottom <= 900);
      await capture("widget", width);
      await evaluate("document.querySelector('.ai-widget textarea').focus()");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", windowsVirtualKeyCode: 27 });
      await waitFor("!document.querySelector('.ai-widget-panel')");
      assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "Abrir asistente");
      await click('[aria-label="Abrir asistente"]');
      await click(".ai-widget-full");
      await waitFor("location.pathname==='/asistente' && !document.querySelector('.ai-widget') && Boolean(document.querySelector('main .ai-chat'))");
      assert.ok(await evaluate("document.querySelector('main [role=log]').textContent.includes('se coordinan')"));
      await evaluate("window.scrollTo(0,0)");
      assert.ok(await evaluate("document.querySelector('main textarea').getBoundingClientRect().bottom<=innerHeight"), "Composer must be visible on the initial chat viewport");
      await capture("chat", width);
      await click('main [aria-label="Nueva conversación"]');
      assert.equal(await evaluate("document.querySelectorAll('main .ai-message-user').length"), 0);
      failNext = true;
      await ask("main .ai-chat", "visitas");
      assert.match(await evaluate("document.querySelector('main [role=alert]').textContent"), /conexión/);
      assert.equal(await evaluate("document.querySelector('main textarea').value"), "visitas");
      await ask("main .ai-chat", "visitas");
      assert.equal(await evaluate("document.querySelectorAll('main .ai-message-user').length"), 1);
      await evaluate("window.qaNavigate('/admin/ia');window.scrollTo(0,0)");
      await waitFor("Boolean(document.querySelector('input[name=nombre]')) && !document.querySelector('input[name=nombre]').disabled");
      await click('[aria-label="Ayuda sobre Administrar IA"]');
      await waitFor("document.querySelector('dialog')?.open");
      assert.match(await evaluate("document.querySelector('dialog').textContent"), /agregar, editar y organizar/);
      assert.doesNotMatch(await evaluate("document.querySelector('dialog').textContent"), /embeddings|tokens|prompts/i);
      await click("dialog button");
      await fill("input[name=nombre]", "Asistente Memoria");
      await click("form button[type=submit]");
      await waitFor("document.body.textContent.includes('Configuración guardada')");
      await ask(".admin-page .ai-chat", "visitas");
      assert.match(await evaluate("document.querySelector('.admin-page [role=log]').textContent"), /se coordinan/);
      await evaluate("window.scrollTo(0,0)"); await capture("admin", width);
      // Return to public view without remounting the conversation provider.
      await evaluate("window.qaNavigate('/asistente')"); await pause(80);
      await click('main [aria-label="Nueva conversación"]');
      await evaluate("window.qaNavigate('/')"); await pause(80);
    }
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 430, deviceScaleFactor: 1, mobile: true });
    await click('[aria-label="Abrir asistente"]');
    await waitFor("Boolean(document.querySelector('.ai-widget-panel'))");
    const keyboardView = await evaluate("(()=>{const r=document.querySelector('.ai-widget-panel').getBoundingClientRect();const t=document.querySelector('.ai-widget textarea').getBoundingClientRect();return {top:r.top,bottom:r.bottom,inputBottom:t.bottom}})()");
    assert.ok(keyboardView.top >= 64 && keyboardView.bottom <= 430 && keyboardView.inputBottom <= 430, "Widget controls remain below the fixed site header in a short keyboard-sized viewport");
    await click('[aria-label="Cerrar asistente"]');
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate("window.qaNavigate('/admin/ia')");
    await waitFor("Boolean(document.querySelector('input[name=nombre]'))");
    await evaluate("[...document.querySelectorAll('button')].find(e=>e.textContent==='Agregar sección').click()");
    await waitFor("document.querySelector('dialog')?.open");
    await fill('dialog input[name="titulo"]', "Horarios de visitas");
    await fill('dialog input[name="categoria"]', "Archivo");
    await fill('dialog textarea[name="contenido"]', "Los horarios de visitas se confirman con la corporación.");
    await fill('dialog input[name="orden"]', "1");
    await click("dialog button[type=submit]");
    await waitFor("!document.querySelector('dialog') && document.body.textContent.includes('Horarios de visitas')");
    await click('[aria-label="Editar Horarios de visitas"]');
    await waitFor("document.querySelector('dialog')?.open");
    await click('dialog input[name="activo"]'); await click("dialog button[type=submit]");
    await waitFor("!document.querySelector('dialog') && document.body.textContent.includes('Inactiva')");
    await click('[aria-label="Eliminar Horarios de visitas"]');
    await waitFor("document.querySelector('dialog')?.open");
    await evaluate("[...document.querySelectorAll('dialog button')].find(e=>e.textContent==='Eliminar sección').click()");
    await waitFor("!document.querySelector('dialog') && !document.body.textContent.includes('Horarios de visitas')");
    await click('form input[type="checkbox"]'); await click("form button[type=submit]");
    await waitFor("document.body.textContent.includes('Configuración guardada')");
    await evaluate("window.qaNavigate('/asistente')"); await pause(80);
    await evaluate("window.dispatchEvent(new Event('focus'))");
    await waitFor("document.querySelector('main textarea').disabled");
    assert.match(await evaluate("document.querySelector('main [role=log]').textContent"), /no está disponible/);
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    assert.equal(await evaluate("document.getAnimations().length"), 0);
    assert.deepEqual(qa.errors, []); assert.deepEqual(qa.external, []);
    assert.equal((await state.store.listKnowledge()).length, 1);
    console.log("HU22 browser screenshots: " + join(tmpdir(), "rq-hu22-*.png"));
  } finally {
    browser?.kill();
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    hooks?.deregister();
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir())); assert.ok(basename(temporary).startsWith("rq-hu22-browser-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
