import { registerHooks, createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
export async function hu22Modules(mocks = {}) {
  const swc = createRequire(import.meta.url)("next/dist/build/swc");
  await swc.loadBindings();
  const sources = { "server-only": "export {};", ...mocks };
  return registerHooks({
    resolve(name, context, next) {
      if (Object.hasOwn(sources, name)) return { url: "hu22-mock:" + name, shortCircuit: true };
      let base;
      if (name.startsWith("@/")) base = resolve(root, "src", name.slice(2));
      else if (name.startsWith(".") && context.parentURL?.startsWith("file:")) base = fileURLToPath(new URL(name, context.parentURL));
      if (base) {
        const path = [base, base + ".js", base + ".jsx", base + ".mjs"].find(existsSync);
        if (path) return { url: pathToFileURL(path).href, shortCircuit: true };
      }
      return next(name, context.parentURL?.startsWith("hu22-mock:") ? { ...context, parentURL: import.meta.url } : context);
    },
    load(url, context, next) {
      if (url.startsWith("hu22-mock:")) return { format: "module", source: sources[url.slice(10)], shortCircuit: true };
      if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
      if (url.endsWith(".jsx")) return { format: "module", shortCircuit: true, source: swc.transformSync(readFileSync(fileURLToPath(url), "utf8"), {
        jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "es6" },
      }).code };
      return next(url, context);
    },
  });
}
