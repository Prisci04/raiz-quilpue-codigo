import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hu22Modules } from "./helpers/hu22-modules.mjs";
const hooks = await hu22Modules({
  "next/link": "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}",
  "next/image": "import React from 'react';export default function Image({fill,priority,unoptimized,sizes,...props}){return React.createElement('img',props)}",
  "next/navigation": "export function useRouter(){return {push(){}}}",
  "@/services/paginas.service": "export async function getPaginaPublica(){if(globalThis.pageFailure)throw new Error('unavailable');return globalThis.pageFixture}",
});
test.after(() => hooks.deregister());
const Home = (await import("../src/app/(sitio)/home-view.jsx")).default;
const About = (await import("../src/app/(sitio)/quienes-somos/page.jsx")).default;
test("Páginas: Home binds editable fields/images while keeping REV1 and static fallback", () => {
  const html = renderToStaticMarkup(React.createElement(Home, { page: { secciones: {
    portada: { campos: { titulo: "Título\nCentral\nFinal", texto_superior: "Portada editable", descripcion: "Descripción editable" },
      imagenes: [{ id: 1, url: "/images/custom-hero.jpg", descripcion: "Imagen editable" }] },
    presentacion: { campos: { titulo: "Presentación editable", contenido: "Primer párrafo\n\nSegundo párrafo", texto_superior: "Nuestra comunidad" },
      imagenes: [{ url: "/images/custom-collage.jpg", descripcion: "Comunidad editable" }] },
  } } }));
  for (const text of ["rev1-home", "Portada editable", "Descripción editable", "Presentación editable", "Segundo párrafo", "custom-hero.jpg", "custom-collage.jpg", "Comunidad editable"]) assert.ok(html.includes(text), text);
  const fallback = renderToStaticMarkup(React.createElement(Home));
  assert.match(fallback, /Historias que/);
  assert.match(fallback, /imgini5.jpg/);
});
test("Páginas: About binds mission, values, directory and closing; empty lists stay empty", async () => {
  globalThis.pageFixture = { secciones: {
    presentacion_mision: { campos: { titulo_pagina: "Página editable", titulo_mision: "Misión editable", parrafos_mision: "Misión uno\n\nMisión dos" } },
    valores: { campos: { titulo_seccion: "Valores editables" }, valores: [{ id: 1, titulo: "Valor editable", descripcion: "Descripción valor" }] },
    directorio: { campos: { titulo_seccion: "Directorio editable" }, integrantes: [
      { id: 1, nombre: "Persona Uno", cargo: "Cargo editable", imagen: { url: "/images/persona.jpg" } },
      { id: 2, nombre: "Persona Dos", cargo: "Otro cargo", descripcion: "Biografía editable" },
    ] },
    cierre: { campos: { contenido_cierre: "Cierre editable" } },
  } };
  let html = renderToStaticMarkup(await About());
  for (const text of ["Página editable", "Misión dos", "Valor editable", "Persona Uno", "Cargo editable", "persona.jpg", "Biografía editable", "Cierre editable"]) assert.ok(html.includes(text), text);
  globalThis.pageFixture.secciones.directorio.integrantes = [];
  globalThis.pageFixture.secciones.valores.valores = [];
  html = renderToStaticMarkup(await About());
  assert.doesNotMatch(html, /Persona Uno|Identidad y pertenencia territorial/);
  globalThis.pageFailure = true;
  try {
    html = renderToStaticMarkup(await About());
    assert.match(html, /Millaray Demanet/);
    assert.match(html, /Preservar la memoria/);
  } finally { globalThis.pageFailure = false; }
});
