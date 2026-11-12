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

// Real page views, cards, shell and CSS; local fixtures avoid any production writes.
test("visual browser: public/admin pages at 1440/1024/390, keyboard, motion preferences and layout stability", {
  skip: !browserPath && "No Chromium; set TEST_BROWSER_PATH", timeout: 120000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), "rq-visual-browser-"));
  let server, browser;
  try {
    await bundleFixture(root, temporary, `
      import React from "react";import {createRoot} from "react-dom/client";
      import Home from "@/app/(sitio)/home-view";
      import Activities from "@/app/(sitio)/actividades/actividades-view";
      import Contents from "@/app/(sitio)/contenido/contenido-view";
      import Museum from "@/app/(sitio)/museo/museo-view";
      import About from "@/app/(sitio)/quienes-somos/page";
      import Header from "@/components/Header";import Footer from "@/components/Footer";
      import Shell from "@/components/admin/AdminShell";
      import Dashboard from "@/app/admin/(panel)/dashboard-view";
      import AdminActivities from "@/components/admin/actividades/ActividadesPanel";
      import AdminContents from "@/components/admin/contenidos/ContenidosPanel";
      import AdminMuseum from "@/components/admin/museo/MuseoPanel";
      import Login from "@/app/admin/login/login-view";
      import AnimatedContent from "@/components/motion/AnimatedContent";
      const activity={id:1,titulo:"Encuentro con la memoria de Quilpué",descripcion:"Una actividad para compartir historias del territorio.",fecha:"2099-01-02",hora_inicio:"12:00",lugar:"Centro cultural",modalidad:"presencial",estado:"publicada",tipo_participacion:"abierta",publico_objetivo:"todas_edades",costo:"gratuito",imagen_url:"/images/inicio/imgini4.JPG"};
      const content={id:1,title:"Historias de nuestro territorio",titulo:"Historias de nuestro territorio",description:"Memorias y relatos de Quilpué.",tipo:"noticia",estado:"publicada",date:"2026-06-17",image:"/images/inicio/imageninicio.jpg"};
      const activities=[activity,{...activity,id:2,titulo:"Recorrido patrimonial"}];
      const contents=[content,{...content,id:2,tipo:"patrimonio"}];
      const views={home:<Home contents={contents} activities={activities}/>,activities:<Activities activities={activities}/>,calendar:<Activities activities={activities} initialView="calendario"/>,contents:<Contents items={contents}/>,museum:<Museum/>,about:<About/>,login:<Login/>,dashboard:<Dashboard dateLabel="8 de noviembre de 2026" publishedContents={2} totalContents={2} publishedActivities={2} totalEnrollments={0} publishedMuseumPieces={0}/>,"admin-activities":<AdminActivities activities={activities}/>,"admin-contents":<AdminContents contenidos={contents}/>,"admin-museum":<AdminMuseum/>};
      const root=createRoot(document.getElementById("app"));let revision=0;
      window.qaRender=(name)=>{window.qaPath=name==='home'?'/':'/'+name;root.render(<React.Fragment key={++revision}>{name==='motion'?<><div style={{height:1800}}/><AnimatedContent className="motion-probe"><button>Foco accesible</button></AnimatedContent><div style={{height:1000}}/></>:['dashboard','admin-activities','admin-contents','admin-museum'].includes(name)?<Shell displayName="Gestión local" email="qa@example.test" isAdministrador>{views[name]}</Shell>:name==='login'?views[name]:<div className="flex min-h-full flex-col pt-16"><Header/>{views[name]}<Footer/></div>}</React.Fragment>)};
      window.qaRender('home');window.qaReady=true;
    `);
    const css = await require("postcss")([require("@tailwindcss/postcss")({ base: root })])
      .process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css") });
    const styles = css.css + await readFile(join(root, "src/components/admin/admin-ui.css"), "utf8")
      + await readFile(join(root, "src/components/home/home-rev1.css"), "utf8")
      + await readFile(join(root, "src/components/footer/footer.css"), "utf8")
      + '@font-face{font-family:Raiz;src:url(/raiz.otf)}:root{--font-raiz-local:Raiz;--font-poppins:Arial}body{margin:0}';
    server = createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        if (path === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(styles); }
        else if (path === "/raiz.otf") res.end(await readFile(join(root, "src/app/fonts/TipografiaRaiz-Regular.otf")));
        else if (path === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(await readFile(join(temporary, "bundle.js"))); }
        else if (path.startsWith("/images/")) {
          const asset = resolve(root, "public", "." + path);
          assert.ok(asset.startsWith(join(root, "public") + "/") || asset.startsWith(join(root, "public") + "\\"));
          res.setHeader("Content-Type", /\.png$/i.test(path) ? "image/png" : "image/jpeg"); res.end(await readFile(asset));
        } else if (path === "/") {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app"></div><script defer src="/bundle.js"></script></html>');
        } else { res.statusCode = 404; res.end(); }
      } catch { res.statusCode = 404; res.end(); }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const qa = await openBrowser(temporary, "http://127.0.0.1:" + server.address().port);
    browser = qa.browser;
    const { send, evaluate, waitFor } = qa;
    await waitFor("window.qaReady && document.querySelector('h1')");
    const views = ["home", "activities", "calendar", "contents", "museum", "about", "login", "dashboard", "admin-activities", "admin-contents", "admin-museum"];
    for (const width of [1440, 1024, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
      for (const name of views) {
        await evaluate(`window.scrollTo(0,0);window.qaRender(${JSON.stringify(name)})`);
        await waitFor("Boolean(document.querySelector('h1'))");
        await pause(450);
        await evaluate("document.fonts.ready.then(()=>true)");
        assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true, name + " overflow at " + width);
        if (name === "admin-contents" && width >= 1024) {
          assert.ok(await evaluate("document.querySelector('.admin-table th').getBoundingClientRect().width>=288"), "Content title must remain readable beside the sidebar");
          assert.ok(await evaluate("document.querySelectorAll('.admin-table th')[1].getBoundingClientRect().width>=176"), "Content type must remain readable inside the scrollable table");
        }
        const capture = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(tmpdir(), `rq-visual-${name}-${width}.png`), Buffer.from(capture.data, "base64"));
        if (name === "home") {
          await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", windowsVirtualKeyCode: 9 });
          await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", windowsVirtualKeyCode: 9 });
          await evaluate("document.querySelector('.interactive-card').focus()");
          assert.notEqual(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), "none");
          await evaluate("document.querySelector('[aria-label=\"Pausar imágenes\"]').click()");
          await waitFor("document.querySelector('[aria-label=\"Reanudar imágenes\"]')?.getAttribute('aria-pressed')==='true'");
        }
      }
    }
    // The scroll reveal must be a single compositor animation, with no layout movement.
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await evaluate("window.scrollTo(0,0);window.qaRender('motion')");
    await waitFor("Boolean(document.querySelector('.motion-probe'))");
    const before = await evaluate("document.querySelector('.motion-probe').offsetTop");
    await evaluate("window.scrollTo(0,1400)");
    await waitFor("document.querySelector('.motion-probe').getAnimations().length===1");
    await evaluate("document.querySelector('.motion-probe button').focus()");
    assert.equal(await evaluate("document.querySelector('.motion-probe').getAnimations().length"), 0, "Focus cancels animation");
    assert.equal(await evaluate("document.querySelector('.motion-probe').offsetTop"), before);
    await evaluate("window.scrollTo(0,0)"); await pause(50);
    await evaluate("window.scrollTo(0,1400)"); await pause(50);
    assert.equal(await evaluate("document.querySelector('.motion-probe').getAnimations().length"), 0, "Reveal runs once");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await evaluate("window.scrollTo(0,0);window.qaRender('motion')");
    await pause(80); await evaluate("window.scrollTo(0,1400)"); await pause(80);
    assert.equal(await evaluate("document.getAnimations().length"), 0);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.motion-probe')).opacity"), "1");
    await evaluate("window.scrollTo(0,0);window.qaRender('home')");
    await waitFor("Boolean(document.querySelector('[aria-label=\"Ver imagen 1\"]'))");
    await pause(5200);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Ver imagen 1\"]').getAttribute('aria-pressed')"), "true", "Reduced motion stops autoplay");
    await evaluate("document.querySelector('.interactive-card').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.interactive-card')).transform"), "none");
    assert.deepEqual(qa.errors, []); assert.deepEqual(qa.external, []);
    console.log("Browser reviewed: 11 views × 3 widths; screenshots: " + join(tmpdir(), "rq-visual-*.png"));
  } finally {
    browser?.kill();
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(basename(temporary).startsWith("rq-visual-browser-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
