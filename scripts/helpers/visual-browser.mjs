import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
export const browserPath = process.env.TEST_BROWSER_PATH ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium", "/usr/bin/google-chrome",
].find(existsSync);
export const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export async function bundleFixture(root, temporary, entry) {
  await writeFile(join(temporary, "entry.jsx"), entry);
  await writeFile(join(temporary, "navigation.js"), 'export function usePathname(){return window.qaPath||"/";}export function useRouter(){return {push(){},replace(){},refresh(){},prefetch(){}};}');
  await writeFile(join(temporary, "link.jsx"), 'import React from "react";export default function Link({children,...props}){return <a {...props}>{children}</a>;}');
  await writeFile(join(temporary, "image.jsx"), 'import React from "react";export default function Image({fill,priority,unoptimized,sizes,...props}){return <img {...props} style={{...props.style,...(fill?{position:"absolute",width:"100%",height:"100%",inset:0}:{})}}/>;}');
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
      module: { rules: [{ test: /\.css$/, use: join(temporary, "empty-loader.cjs") },
        { test: /\.jsx?$/, include: [join(root, "src"), temporary], use: join(temporary, "loader.cjs") }] },
    });
    compiler.run((error, stats) => compiler.close(() => error || stats.hasErrors()
      ? reject(error ?? new Error(stats.toString({ all: false, errors: true }))) : done()));
  });
}

export async function openBrowser(temporary, origin) {
  const browser = spawn(browserPath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
    "--disable-background-networking", "--disable-component-update", "--disable-sync", "--remote-debugging-pipe",
    "--user-data-dir=" + join(temporary, "profile"), "about:blank"],
  { windowsHide: true, stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
  let sequence = 0, sessionId, buffer = "";
  const pending = new Map(), errors = [], external = [];
  function send(method, params = {}) {
    return new Promise((done, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 10000);
      pending.set(id, { done: (value) => { clearTimeout(timer); done(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
      browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
    });
  }
  browser.stdio[4].on("data", (chunk) => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf("\0")) !== -1) {
      const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!raw) continue;
      const message = JSON.parse(raw);
      if (message.id) {
        const callback = pending.get(message.id); pending.delete(message.id);
        if (callback) message.error ? callback.reject(new Error(message.error.message)) : callback.done(message.result);
      } else if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
      } else if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const local = request.url.startsWith(origin + "/");
        if (!local) external.push(request.url);
        void send(local ? "Fetch.continueRequest" : "Fetch.failRequest", local ? { requestId } : { requestId, errorReason: "BlockedByClient" });
      }
    }
  });
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let i = 0; i < 200; i++) { if (await evaluate("Boolean(" + expression + ")")) return; await pause(30); }
    throw new Error("Browser condition not met: " + expression);
  }
  try {
    const targets = await send("Target.getTargets");
    sessionId = (await send("Target.attachToTarget", { targetId: targets.targetInfos.find((target) => target.type === "page").targetId, flatten: true })).sessionId;
    await send("Runtime.enable");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await send("Page.navigate", { url: origin });
    return { browser, send, evaluate, waitFor, errors, external };
  } catch (error) { browser.kill(); throw error; }
}
