import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { browserPath, bundleFixture, openBrowser, pause } from "./helpers/visual-browser.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

test("Home REV1: real public layout, data/empty states, search, carousel, footer edge and widget at 1440/1024/390", {
  skip: !browserPath && "No Chromium; set TEST_BROWSER_PATH", timeout: 120000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), "rq-home-rev1-"));
  let server, browser;
  try {
    await bundleFixture(root, temporary, `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import Layout from '@/app/(sitio)/layout';import Home from '@/app/(sitio)/home-view';
      const content={id:1,title:'Memorias compartidas',description:'Relatos de nuestra comunidad.',tipo:'patrimonio',date:'2026-11-10',image:'/images/inicio/imgini5.jpg'};
      const activity={id:1,titulo:'Encuentro cultural',fecha:'2026-11-10',hora_inicio:'12:00',hora_fin:'14:00',lugar:'Quilpué',modalidad:'Presencial',tipo_participacion:'Abierta',imagen_url:'/images/inicio/imgini4.JPG'};
      const app=createRoot(document.getElementById('app'));let revision=0;
      window.qaHome=(empty=false)=>app.render(<Layout key={++revision}><Home contents={empty?[]:[content,{...content,id:2,tipo:'noticia'},{...content,id:3}]} activities={empty?[]:[activity,{...activity,id:2},{...activity,id:3}]}/></Layout>);
      window.qaHome();
    `);
    const css = await require("postcss")([require("@tailwindcss/postcss")({ base: root })])
      .process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css") });
    const styles = css.css + (await Promise.all(["src/components/header-rev1.css", "src/components/home/home-rev1.css", "src/components/footer/footer.css", "src/components/ai/assistant.css"].map((path) => readFile(join(root, path), "utf8")))).join("\n")
      + '@font-face{font-family:Raiz;src:url(/raiz.otf)}:root{--font-raiz-local:Raiz;--font-poppins:Arial}body{margin:0}';
    server = createServer(async (req, res) => {
      const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      try {
        if (path === "/api/ia/configuracion") { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ success: true, data: { activo: true, nombre: "Asistente Raíz", mensaje_inicial: "Bienvenido a Raíz Quilpué." } })); }
        else if (path === "/style.css") { res.setHeader("content-type", "text/css"); res.end(styles); }
        else if (path === "/bundle.js") { res.setHeader("content-type", "text/javascript"); res.end(await readFile(join(temporary, "bundle.js"))); }
        else if (path === "/raiz.otf") res.end(await readFile(join(root, "src/app/fonts/TipografiaRaiz-Regular.otf")));
        else if (path.startsWith("/images/")) {
          const asset = resolve(root, "public", "." + path); assert.ok(asset.startsWith(resolve(root, "public") + "/") || asset.startsWith(resolve(root, "public") + "\\"));
          res.setHeader("content-type", /\.png$/i.test(path) ? "image/png" : "image/jpeg"); res.end(await readFile(asset));
        } else if (path === "/") { res.setHeader("content-type", "text/html; charset=utf-8"); res.end('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app"></div><script defer src="/bundle.js"></script></html>'); }
        else { res.statusCode = 404; res.end(); }
      } catch { res.statusCode = 500; res.end(); }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const qa = await openBrowser(temporary, "http://127.0.0.1:" + server.address().port); browser = qa.browser;
    const { send, evaluate, waitFor } = qa;
    await waitFor("typeof window.qaHome==='function'");
    async function capture(name, width) {
      await pause(800);
      assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"), name + " overflow at " + width);
      await writeFile(join(tmpdir(), `rq-home-rev1-${name}-${width}.png`), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    }
    for (const width of [1440, 1024, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
      await evaluate("window.scrollTo(0,0);window.qaHome()");
      await waitFor("Boolean(document.querySelector('.home-hero')) && Boolean(document.querySelector('.ai-widget-toggle'))");
      await evaluate("document.fonts.ready");
      await evaluate("document.querySelector('[aria-label=\"Pausar imágenes\"]').click()");
      await capture("hero", width);
      assert.equal(await evaluate(`(()=>{const w=document.querySelector('.ai-widget-toggle').getBoundingClientRect();return [...document.querySelectorAll('.home-slide-buttons button')].every(e=>{const r=e.getBoundingClientRect();return r.right<=w.left||r.left>=w.right||r.bottom<=w.top||r.top>=w.bottom})})()`), true, "Widget must not cover carousel controls");

      for (const [name, selector] of [["comunidad", ".home-about"], ["museo", ".home-museum"], ["historias", ".home-journal"], ["actividades", ".home-activities"]]) {
        await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
        await capture(name, width);
      }
      assert.equal(await evaluate("document.querySelectorAll('.home-story').length"), 3);
      assert.equal(await evaluate("document.querySelectorAll('.home-activity-card').length"), 3);
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.home-pathways a')].map(a=>a.getAttribute('href'))"), ["/contenido?tipo=patrimonio", "/contenido?tipo=noticia", "/actividades"]);
      assert.ok(await evaluate("document.querySelector('.home-story a').getAttribute('href')==='/contenido/1' && document.querySelector('.home-activity-card a').getAttribute('href')==='/actividades/1'"));
      await evaluate("window.scrollTo(0,document.documentElement.scrollHeight)");
      await capture("footer", width);
      assert.ok(await evaluate("Math.abs(document.querySelector('footer').getBoundingClientRect().bottom+scrollY-document.documentElement.scrollHeight)<=1"), "Footer must end at the document edge");
      assert.ok(await evaluate("Boolean(document.elementFromPoint(2,innerHeight-2)?.closest('footer'))"), "No light strip below footer");
      await evaluate("document.querySelector('.ai-widget-toggle').click()");
      await waitFor("Boolean(document.querySelector('.ai-widget-panel'))");
      await capture("widget-footer", width);
      const panel = await evaluate("(()=>{const r=document.querySelector('.ai-widget-panel').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()");
      assert.ok(panel.left >= 0 && panel.right <= width && panel.top >= 64 && panel.bottom <= 900);
      await evaluate("document.querySelector('[aria-label=\"Cerrar asistente\"]').click()"); await waitFor("!document.querySelector('.ai-widget-panel')");
      await evaluate("document.querySelector('.rev1-footer-top').click()"); await waitFor("scrollY<2");
      await evaluate("document.querySelector('[aria-label=\"Ver imagen 2\"]').click()");
      assert.equal(await evaluate("document.querySelector('[aria-label=\"Ver imagen 2\"]').getAttribute('aria-pressed')"), "true");
      for (const [text, destination] of [["talleres", "/actividades"], ["nosotros", "/quienes-somos"], ["memoria local", "/contenido?q=memoria%20local"]]) {
        await evaluate(`(()=>{const e=document.querySelector('.home-search input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        await pause(20); await evaluate("document.querySelector('.home-search').requestSubmit()");
        await waitFor(`window.qaNavigation===${JSON.stringify(destination)}`);
      }
      if (width === 390) {
        await evaluate("document.querySelector('[aria-controls=\"menu-movil\"]').click()");
        await waitFor("document.querySelector('[aria-controls=\"menu-movil\"]').getAttribute('aria-expanded')==='true'");
        await capture("navegacion", width);
        await evaluate("document.querySelector('[aria-controls=\"menu-movil\"]').click()");
      }
      await evaluate("window.qaHome(true);window.scrollTo(0,0)");
      await waitFor("document.querySelector('.home-journal').textContent.includes('Aún no hay contenidos publicados') && document.querySelector('.home-activities').textContent.includes('Aún no hay actividades publicadas')");
      assert.equal(await evaluate("document.querySelectorAll('.home-story,.home-activity-card').length"), 0);
      assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth"));
    }
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await evaluate("window.qaHome();window.scrollTo(0,0)"); await pause(100);
    await waitFor("document.getAnimations().length===0");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.home-slide')).transitionDuration"), "0s");
    await evaluate("document.querySelector('.home-search input').focus()");
    assert.ok(await evaluate("parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=2"));
    assert.deepEqual(qa.errors, []); assert.deepEqual(qa.external, []);
    console.log("REV1 Home reviewed at 1440/1024/390: search, navigation, content, activities, footer, widget and reduced motion. Captures: " + join(tmpdir(), "rq-home-rev1-*.png"));
  } finally {
    browser?.kill();
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir())); assert.ok(basename(temporary).startsWith("rq-home-rev1-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
