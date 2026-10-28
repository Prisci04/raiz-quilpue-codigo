import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const browserPath = process.env.TEST_BROWSER_PATH ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium", "/usr/bin/google-chrome",
].find((path) => existsSync(path));
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

test("native admin dialog lifecycle in Chromium: focus, keyboard, busy state and three viewports", {
  skip: !browserPath && "No Chromium browser; set TEST_BROWSER_PATH",
  timeout: 30000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), "rq-admin-browser-"));
  let browser, server;
  try {
    const html = '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<title>QA local</title><style>*{box-sizing:border-box}</style><link rel="stylesheet" href="/style.css"><div class="admin-shell admin-page">'
      + '<h1>Prueba local</h1><button id="opener">Abrir</button><button id="outside">Fondo</button>'
      + '<dialog class="admin-dialog" aria-labelledby="title" aria-describedby="help" style="max-width:32rem;background:white;padding:24px">'
      + '<h2 id="title">Confirmar operación</h2><p id="help">Ejemplo sin datos reales.</p>'
      + '<button id="cancel">Cancelar</button><label for="field">Nombre</label><input id="field"><button id="last">Confirmar</button></dialog>'
      + '</div><script type="module">'
      + 'import {mountDialog} from "/dialog.mjs"; const d=document.querySelector("dialog");let cleanup;window.busy=false;'
      + 'function close(){if(window.busy)return;cleanup();}document.getElementById("opener").onclick=()=>{cleanup=mountDialog(d,close);};'
      + 'document.getElementById("cancel").onclick=close;window.ready=true;</script></html>';
    server = createServer(async (req, res) => {
      if (req.url === "/dialog.mjs") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(await readFile(join(root, "src/lib/ui/dialog.mjs")));
      } else if (req.url === "/style.css") {
        res.setHeader("Content-Type", "text/css");
        res.end(await readFile(join(root, "src/components/admin/admin-ui.css")));
      } else if (req.url === "/") {
        res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html);
      } else { res.statusCode = 404; res.end(); }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const origin = "http://127.0.0.1:" + server.address().port;
    browser = spawn(browserPath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--remote-debugging-pipe", "--user-data-dir=" + temporary, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    let sessionId;
    function send(method, params = {}) {
      return new Promise((done, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => reject(new Error("CDP timeout: " + method)), 5000);
        pending.set(id, { done: (value) => { clearTimeout(timer); done(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
        browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
      });
    }
    function receive(message) {
      if (message.id) {
        const waiting = pending.get(message.id); pending.delete(message.id);
        if (message.error) waiting.reject(new Error(message.error.message));
        else waiting.done(message.result);
      } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      else if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const local = request.url.startsWith(origin + "/");
        void send(local ? "Fetch.continueRequest" : "Fetch.failRequest", local ? { requestId } : { requestId, errorReason: "BlockedByClient" });
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
    async function key(key, code, modifiers = 0) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, text: key === "Enter" ? "\r" : undefined, windowsVirtualKeyCode: code, modifiers });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: code, modifiers });
    }
    const targets = await send("Target.getTargets");
    const attached = await send("Target.attachToTarget", { targetId: targets.targetInfos.find((target) => target.type === "page").targetId, flatten: true });
    sessionId = attached.sessionId;
    await send("Runtime.enable");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await send("Page.navigate", { url: origin });
    await send("Page.bringToFront");
    for (let i = 0; i < 100 && !(await evaluate("Boolean(window.ready)")); i++) await pause(20);
    assert.equal(await evaluate("Boolean(window.ready)"), true);
    for (const width of [1440, 1024, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: false });
      await evaluate("document.getElementById('opener').focus()");
      await key("Enter", 13);
      assert.equal(await evaluate("document.activeElement.id"), "cancel");
      assert.equal(await evaluate("document.body.style.overflow"), "hidden");
      assert.equal(await evaluate("document.querySelector('dialog').matches(':modal')"), true);
      assert.ok(await evaluate("(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<=innerHeight-30;})()"));
      await key("Tab", 9, 8);
      assert.equal(await evaluate("document.activeElement.id"), "last");
      await key("Tab", 9);
      assert.equal(await evaluate("document.activeElement.id"), "cancel");
      await evaluate("window.busy=true");
      await key("Escape", 27);
      assert.equal(await evaluate("document.querySelector('dialog').open"), true);
      await evaluate("window.busy=false");
      await key("Escape", 27);
      assert.equal(await evaluate("document.querySelector('dialog').open"), false);
      assert.equal(await evaluate("document.activeElement.id"), "opener");
      assert.equal(await evaluate("document.body.style.overflow"), "");
    }
    // If a deleted row was the opener, return focus to the page heading.
    await evaluate("document.getElementById('opener').focus();document.getElementById('opener').click();document.getElementById('opener').remove()");
    await key("Escape", 27);
    assert.equal(await evaluate("document.activeElement.tagName"), "H1");
    assert.deepEqual(errors, []);
    sessionId = undefined;
    await send("Browser.close");
  } finally {
    if (browser && browser.exitCode === null) browser.kill();
    if (server) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    // Verify the resolved temporary target before recursive deletion on Windows.
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(basename(temporary).startsWith("rq-admin-browser-"));
    await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
