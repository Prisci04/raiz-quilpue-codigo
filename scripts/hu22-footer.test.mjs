import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { hu22Modules } from "./helpers/hu22-modules.mjs";
const hooks = await hu22Modules({
  "next/link": "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}",
  "next/image": "import React from 'react';export default function Image(props){return React.createElement('img',props)}",
});
test.after(() => hooks.deregister());
const Footer = (await import("../src/components/Footer.jsx")).default;
test("HU22 REV1 Footer prerenders official identity, real routes/contact and accessible navigation without JS", () => {
  const html = renderToStaticMarkup(React.createElement(Footer));
  for (const text of ["Raíz Quilpué", "Cultura", "Memoria", "Territorio", "raizquilpue@gmail.com", "+56 9 3940 5350", "Volver arriba"]) assert.ok(html.includes(text));
  for (const route of ["/", "/quienes-somos", "/contenido", "/actividades", "/museo", "/asistente"]) assert.ok(html.includes('href="' + route + '"'));
  assert.match(html, /raiz-quilpue-isotipo\.png/); assert.match(html, /https:\/\/www.instagram.com\/raizquilpue\//);
  assert.match(html, /href="tel:\+56939405350"/); assert.match(html, /aria-label="Explorar Raíz Quilpué"/);
  assert.doesNotMatch(html, /href="#"|WebGL|canvas/);
});
test("HU22 Footer motion and decoration remain scoped with reduced motion and space for the floating assistant", async () => {
  const css = await readFile(new URL("../src/components/footer/footer.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /padding: 32px 22px 124px/);
  assert.doesNotMatch(css, /animation:\s*[^;]*infinite/);
});
