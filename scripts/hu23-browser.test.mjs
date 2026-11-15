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
const liveTiles = process.env.HU23_LIVE_OSM_TILES === "1";
test("HU-23 Leaflet browser: manual search, selection, correction, persistence errors and responsive", {skip: !browserPath && "No Chromium", timeout:60000}, async()=>{
  const temporary = await mkdtemp(join(tmpdir(), "rq-hu23-browser-"));
  let browser, server;
  try {
    // Bundle the actual components and existing editor, not a reproduction of the UI.
    await writeFile(join(temporary, "entry.jsx"), [
      'import React from "react";import {createRoot} from "react-dom/client";',
      'import Form from "@/components/admin/actividades/ActividadForm";',
      'import Public from "@/components/actividades/ActividadFicha";',
      'const activity={titulo:"Encuentro cultural",descripcion:"Actividad local de prueba",fecha:"2099-01-02",',
      'id_lugar:10,id_comuna:20,id_region:30,id_modalidad:1,id_publico:1,id_tipo_participacion:1,id_costo:1,id_estado:1,lugar:"Centro cultural propio",direccion:"",google_place_id:"legacy-reference",latitud:null,longitud:null,modalidad:"presencial",',
      'tipo_valor:"gratuito",tipo_participacion:"abierta",publico_objetivo:"todas_edades",estado:"borrador"};',
      'function Preview({saved}){const [point,setPoint]=React.useState(saved);window.hu23PublicLocation=setPoint;return <div id="public"><Public activity={{...activity,lugar:"Centro cultural",direccion:"Dirección propia",...point}}/></div>}',
      'const root=createRoot(document.getElementById("app"));let revision=0;window.hu23RenderForm=(editing,saved=activity)=>{revision++;root.render(<React.Fragment key={revision}><main className="admin-shell"><Form activityId={editing?"1":null} initialActivity={saved}/></main><Preview saved={saved}/></React.Fragment>)};window.hu23ReloadSaved=async()=>{const r=await fetch("/api/admin/actividades/1");const {data}=await r.json();window.hu23RenderForm(true,{...data,modalidad:"presencial"});};window.hu23RenderForm(false);',
    ].join("\n"));
    await writeFile(join(temporary, "navigation.js"), 'export function useRouter(){return {replace(path){window.navigated=path;},prefetch(){}};}');
    await writeFile(join(temporary, "link.jsx"), 'import React from "react";export default function Link({children,...props}){return <a {...props}>{children}</a>;}');
    await writeFile(join(temporary, "image.jsx"), 'import React from "react";export default function Image({src,alt}){return <img src={src} alt={alt}/>;}');
    await writeFile(join(temporary, "loader.cjs"), 'const swc=require(' + JSON.stringify(require.resolve("next/dist/build/swc")) + ');module.exports=async function(source){await swc.loadBindings();return swc.transformSync(source,{jsc:{parser:{syntax:"ecmascript",jsx:true},transform:{react:{runtime:"automatic"}}},module:{type:"es6"}}).code;};');
    await writeFile(join(temporary, "empty-loader.cjs"), 'module.exports=function(){return "export {};";}');
    const webpack = require("next/dist/compiled/webpack/webpack").webpack;
    await new Promise((done, reject) => {
      const compiler = webpack({
        mode: "development", devtool: false, context: root, entry: join(temporary, "entry.jsx"),
        output: { path: temporary, filename: "bundle.js", publicPath: "/" },
        resolve: { extensions: [".js", ".jsx", ".mjs"], modules: [join(root, "node_modules")], alias: {
          "@": join(root, "src"), "next/navigation$": join(temporary, "navigation.js"),
          "next/link$": join(temporary, "link.jsx"), "next/image$": join(temporary, "image.jsx"),
        } },
        module: { rules: [{ test: /\.css$/, use: join(temporary, "empty-loader.cjs") },{ test: /\.jsx?$/, include: [join(root, "src"), temporary], use: join(temporary, "loader.cjs") }] },
        plugins: [new webpack.DefinePlugin({"process.env.NEXT_PUBLIC_OSM_TILE_URL": '""'})],
      });
      compiler.run((error, stats) => {
        compiler.close(() => {
          if (error || stats.hasErrors()) reject(error ?? new Error(stats.toString({ all: false, errors: true })));
          else done();
        });
      });
    });
    const css = await require("postcss")([require("@tailwindcss/postcss")({ base: root })])
      .process(await readFile(join(root, "src/app/globals.css"), "utf8"), { from: join(root, "src/app/globals.css") });
    const styles = await readFile(join(root, "node_modules/leaflet/dist/leaflet.css"), "utf8")
      + await readFile(join(root, "src/components/maps/openstreetmap.css"), "utf8") + css.css + "\n" + await readFile(join(root, "src/components/admin/admin-ui.css"), "utf8")
      + "\nbody{margin:0;font-family:sans-serif}.admin-shell{padding:24px;max-width:1100px;margin:auto}";

    const saves=[],external=[],searches=[];
    const catalogs={
      modalidad:[{id:1,nombre:"Presencial"},{id:2,nombre:"Virtual"},{id:3,nombre:"Híbrida"}],
      tipo_participacion:[{id:1,nombre:"Abierta"}],costo_actividad:[{id:1,nombre:"Gratuita"}],
      publico_objetivo:[{id:1,nombre:"Todas las edades"}],estado_publicacion:[{id:1,nombre:"Borrador"},{id:2,nombre:"Publicada"}],
    };
    let unavailable=true, stored;
    server=createServer(async(req,res)=>{
      if(/^\/[^/?]+\.js$/.test(req.url)){res.setHeader("Content-Type","text/javascript");res.end(await readFile(join(temporary,basename(req.url))));}
      else if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");res.end(styles);}
      else if(req.url.startsWith("/api/catalogos")){
        res.setHeader("Content-Type","application/json");res.end(JSON.stringify({success:true,data:catalogs}));
      }else if(req.url.startsWith("/api/ubicaciones")){
        res.setHeader("Content-Type","application/json");res.end(JSON.stringify({success:true,data:{
          regiones:[{id:30,nombre:"Valparaíso"}],comunas:[{id:20,nombre:"Quilpué"}],
          lugares:[{id:10,nombre:"Centro cultural propio",latitud:null,longitud:null}],
        }}));
      }else if(req.url==="/api/admin/actividades/ubicacion"){
        let body="";for await(const chunk of req)body+=chunk;const data=JSON.parse(body);searches.push(data.query);
        res.setHeader("Content-Type","application/json");
        if(data.query.includes("error")){res.statusCode=502;res.end(JSON.stringify({success:false,error:{message:"El buscador no está disponible."}}));}
        else if(data.query.includes("empty"))res.end(JSON.stringify({success:true,data:[]}));
        else if(data.query.includes("slow"))setTimeout(()=>res.end(JSON.stringify({success:true,data:[{id:"old",label:"Respuesta tardía",latitud:1,longitud:1}]})),300);
        else res.end(JSON.stringify({success:true,data:[{id:"point",label:"Recinto, Quilpué",latitud:-33.05,longitud:-71.45}]}));
      }else if(req.url==="/api/admin/actividades"||req.url==="/api/admin/actividades/1"){
        if(req.method==="GET"){res.setHeader("Content-Type","application/json");res.end(JSON.stringify({success:true,data:stored}));return;}
        let body="";for await(const chunk of req)body+=chunk;saves.push(JSON.parse(body));res.setHeader("Content-Type","application/json");
        if(unavailable){unavailable=false;res.statusCode=503;res.end(JSON.stringify({success:false,error:{code:"ACTIVIDAD_UBICACION_UNAVAILABLE",message:"La ubicación adicional todavía no está habilitada para guardarse."}}));}
        else {stored={...saves.at(-1),id:1};res.end(JSON.stringify({success:true,data:stored}));}
      }else if(req.url==="/"){res.setHeader("Content-Type","text/html; charset=utf-8");res.end('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="app"></div><script defer src="/bundle.js"></script></html>');}
      else {res.statusCode=404;res.end();}
    });
    await new Promise(done=>server.listen(0,"127.0.0.1",done));
    const origin="http://127.0.0.1:"+server.address().port;
    browser=spawn(browserPath,["--headless=new","--no-sandbox","--disable-gpu","--no-first-run","--disable-background-networking","--disable-component-update","--disable-sync","--remote-debugging-pipe","--user-data-dir="+join(temporary,"profile"),"about:blank"],{windowsHide:true,stdio:["ignore","ignore","ignore","pipe","pipe"]});
    let sequence = 0, sessionId;
    const pending = new Map(), errors = [];
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
      } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);

      else if(message.method==="Fetch.requestPaused"){
        const {requestId,request}=message.params;
        const local=request.url.startsWith(origin+"/");
        if(new URL(request.url).hostname==="tile.openstreetmap.org"){
          if(liveTiles) void send("Fetch.continueRequest",{requestId});
          else void send("Fetch.fulfillRequest",{requestId,responseCode:200,responseHeaders:[{name:"Content-Type",value:"image/png"},{name:"Cache-Control",value:"max-age=604800"}],body:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="});
        }else{
          if(!local)external.push(new URL(request.url).origin);
          void send(local?"Fetch.continueRequest":"Fetch.failRequest",local?{requestId}:{requestId,errorReason:"BlockedByClient"});
        }
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
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    }
    async function key(key, code) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, text: key === "Enter" ? "\r" : undefined, windowsVirtualKeyCode: code });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: code });
    }
    const targets = await send("Target.getTargets");
    sessionId = (await send("Target.attachToTarget", { targetId: targets.targetInfos.find((target) => target.type === "page").targetId, flatten: true })).sessionId;
    await send("Runtime.enable");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await send("Page.navigate", { url: origin });
    await send("Page.bringToFront");

    async function waitFor(expression) {
      for (let i=0;i<150;i++){if(await evaluate(expression))return;await pause(30);}
      throw new Error("Browser condition not met: "+expression);
    }
    const click = async(label) => {await evaluate("[...document.querySelectorAll('.admin-shell button')].find(e=>e.textContent==="+JSON.stringify(label)+").click()");await pause(50);};
    await waitFor("[...document.querySelectorAll('.admin-shell select option')].some(e=>e.textContent==='Centro cultural propio') && Boolean(document.querySelector('input[id$=\"-query\"]'))");
    for(const [index,width] of [1440,1024,390].entries()){
      if(index===1){await evaluate("window.hu23RenderForm(true)");await waitFor("[...document.querySelectorAll('.admin-shell select option')].some(e=>e.textContent==='Centro cultural propio') && Boolean(document.querySelector('input[id$=\"-query\"]'))");}
      await send("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:width===390});
      if(index<2){
        await evaluate("document.querySelector('input[name=direccion]').focus()");
        await send("Input.insertText",{text:"Av. Los Carrera 100, Quilpué"});
      }
      const beforeSearch=searches.length;
      await evaluate("document.querySelector('input[id$=\"-query\"]').focus()");
      await send("Input.insertText",{text:"Quilpué"});
      await pause(80);assert.equal(searches.length,beforeSearch,"Typing must not geocode");
      await click("Buscar ubicación");await waitFor("Boolean(document.querySelector('[aria-label=\"Resultados de ubicación\"] button'))");
      assert.equal(searches.length,beforeSearch+1);
      await evaluate("document.querySelector('[aria-label=\"Resultados de ubicación\"] button').focus()");
      await key("Enter",13);await waitFor("Boolean(document.querySelector('.admin-shell .leaflet-marker-icon'))");
      await waitFor("document.activeElement.classList.contains('rq-location-map')");
      assert.equal(await evaluate("document.activeElement.classList.contains('rq-location-map')"),true,"Selection must preserve keyboard focus");
      assert.equal(saves.length,0);
      assert.equal(await evaluate("document.querySelector('input[name=direccion]').value"),"Av. Los Carrera 100, Quilpué");
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
      assert.equal(await evaluate("document.querySelector('.leaflet-control-attribution').textContent.includes('OpenStreetMap')"),true);
      const original=await evaluate("document.querySelector('.admin-shell [role=status]').textContent");
      await evaluate("document.querySelector('.admin-shell .leaflet-container').scrollIntoView({block:'center'})");
      const rect=await evaluate("(()=>{const r=document.querySelector('.admin-shell .leaflet-container').getBoundingClientRect();return{x:r.x+r.width*.7,y:r.y+r.height*.4}})()");
      await send("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...rect});
      await send("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...rect});
      await pause(80);assert.notEqual(await evaluate("document.querySelector('.admin-shell [role=status]').textContent"),original);
      await click("Seleccionar centro del mapa");
      assert.equal(await evaluate("document.querySelector('input[name=direccion]').value"),"Av. Los Carrera 100, Quilpué");
      if(liveTiles)await waitFor("[...document.querySelectorAll('.admin-shell .leaflet-tile-loaded')].some(e=>e.naturalWidth===256)");
      const capture=await send("Page.captureScreenshot",{format:"png"});
      await writeFile(join(tmpdir(),"rq-hu23-osm-"+(liveTiles?"live-":"mock-")+width+".png"),Buffer.from(capture.data,"base64"));
      await evaluate("window.hu23PublicLocation({latitud:-33.05,longitud:-71.45})");
      await waitFor("Boolean(document.querySelector('#public .leaflet-marker-icon'))");
      for (const scope of [".admin-shell", "#public"]) {
        const links=await evaluate("[...document.querySelectorAll('"+scope+" a[href*=\"google.com/maps\"]')].map(e=>({text:e.textContent,url:e.href}))");
        assert.equal(new URL(links.find(link=>link.text==="Cómo llegar").url).pathname,"/maps/dir/");
        assert.equal(new URL(links.find(link=>link.text==="Abrir en Google Maps").url).pathname,"/maps/search/");
      }
      const publicCapture=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,clip:await evaluate("(()=>{const r=document.querySelector('[aria-label=\"Ubicación del evento\"]').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()")});
      await writeFile(join(tmpdir(),"rq-hu23-public-"+width+".png"),Buffer.from(publicCapture.data,"base64"));
      assert.equal(await evaluate("[...document.querySelectorAll('#public a[href*=google]')].some(e=>e.href.includes('key='))"),false);
      await click("Quitar coordenadas");
      assert.equal(await evaluate("document.activeElement.id.endsWith('-query')"),true);
      assert.equal(await evaluate("[...document.querySelectorAll('.admin-shell select option:checked')].find(e=>e.value==='10')?.textContent"),"Centro cultural propio");
      assert.equal(await evaluate("document.querySelector('.admin-shell .leaflet-marker-icon')===null"),true);
    }
    await click("Buscar ubicación");await waitFor("Boolean(document.querySelector('[aria-label=\"Resultados de ubicación\"] button'))");
    await evaluate("document.querySelector('[aria-label=\"Resultados de ubicación\"] button').click()");
    await waitFor("Boolean(document.querySelector('.admin-shell .leaflet-marker-icon'))");
    await evaluate("document.querySelector('form').requestSubmit()");
    await waitFor("document.body.textContent.includes('todavía no está habilitada')");
    assert.equal(saves.length,1);assert.equal(saves[0].latitud,-33.05);assert.equal(saves[0].direccion,"Av. Los Carrera 100, Quilpué");
    assert.equal(saves[0].google_place_id,"legacy-reference");
    await evaluate("(()=>{const s=[...document.querySelectorAll('.admin-shell select')].find(e=>[...e.options].some(o=>o.textContent==='Online'));s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await pause(80);
    assert.equal(await evaluate("document.querySelectorAll('.admin-shell .leaflet-container,.admin-shell input[id$=\"-query\"],.admin-shell a[href*=google]').length"),0);
    await evaluate("window.hu23PublicLocation({modalidad:'virtual',latitud:-33,longitud:-71})");await pause(80);
    assert.equal(await evaluate("document.querySelectorAll('#public .leaflet-container,#public a[href*=google]').length"),0);
    await evaluate("(()=>{const s=[...document.querySelectorAll('.admin-shell select')].find(e=>[...e.options].some(o=>o.textContent==='Online'));s.value='3';s.dispatchEvent(new Event('change',{bubbles:true}));})()");await pause(80);
    await click("Quitar coordenadas");
    await evaluate("document.querySelector('input[id$=\"-query\"]').focus()");await send("Input.insertText",{text:"empty"});
    await click("Buscar ubicación");await waitFor("document.body.textContent.includes('No encontramos resultados')");
    await evaluate("document.querySelector('input[id$=\"-query\"]').value=''");
    await send("Input.insertText",{text:"slow"});
    await click("Buscar ubicación");
    assert.equal(await evaluate("[...document.querySelectorAll('.admin-shell button')].find(e=>e.textContent==='Buscando ubicación…').disabled"),true);
    await click("Cancelar búsqueda");await pause(350);
    assert.equal(await evaluate("document.body.textContent.includes('Respuesta tardía')"),false);
    await evaluate("document.querySelector('input[id$=\"-query\"]').focus()");await send("Input.insertText",{text:" error"});
    await click("Buscar ubicación");await waitFor("Boolean(document.querySelector('.admin-shell [role=alert]'))");
    assert.equal(await evaluate("document.querySelector('input[name=direccion]').value"),"Av. Los Carrera 100, Quilpué");
    await evaluate("document.querySelector('form').requestSubmit()");await waitFor("Boolean(window.navigated)");
    assert.equal(saves.length,2);assert.equal(saves.at(-1).latitud,null);assert.equal(saves.at(-1).longitud,null);
    assert.equal(saves.at(-1).google_place_id,"legacy-reference");
    // Successful save + fresh read + remount verifies the selected point survives reopening.
    await evaluate("window.hu23RenderForm(true)");
    await waitFor("Boolean(document.querySelector('input[id$=\"-query\"]'))");
    await click("Buscar ubicación");
    await waitFor("Boolean(document.querySelector('[aria-label=\"Resultados de ubicación\"] button'))");
    await evaluate("document.querySelector('[aria-label=\"Resultados de ubicación\"] button').click()");
    await waitFor("Boolean(document.querySelector('.admin-shell .leaflet-marker-icon'))");
    await evaluate("window.navigated=null;document.querySelector('form').requestSubmit()");
    await waitFor("Boolean(window.navigated)");
    assert.equal(stored.latitud,-33.05);assert.equal(stored.longitud,-71.45);
    await evaluate("window.hu23ReloadSaved()");
    await waitFor("document.querySelectorAll('.leaflet-marker-icon').length===2");
    assert.match(await evaluate("document.querySelector('.admin-shell [role=status]').textContent"),/-33\.050000/);
    assert.equal(await evaluate("new URL([...document.querySelectorAll('#public a')].find(e=>e.textContent==='Cómo llegar').href).searchParams.get('destination')"),"-33.05,-71.45");
    assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    sessionId=undefined;await send("Browser.close");
  } finally {
    if (browser && browser.exitCode === null) browser.kill();
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    // Verify resolved scope before recursive temporary cleanup on Windows.
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(basename(temporary).startsWith("rq-hu23-browser-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
