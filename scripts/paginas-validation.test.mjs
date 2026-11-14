import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PAGINAS,
  SECCIONES,
  SECCION_DE_LISTA,
  getPagina,
  getSeccion,
} from "../src/lib/paginas/estructura.mjs";
import { PaginaError } from "../src/lib/paginas/errors.mjs";
import {
  initials,
  normalizeKey,
  normalizeParrafos,
  normalizeTexto,
  normalizeTitulo,
  splitParagraphs,
  splitTitleLines,
  valorLayout,
} from "../src/lib/paginas/text.mjs";
import {
  parseCamposPayload,
  parseDescripcionFormulario,
  parseId,
  parseImagenDescripcion,
  parseImagenesSeccionPayload,
  parseImagenIntegrantePayload,
  parseIntegranteInput,
  parseOrdenPayload,
  parsePaginaId,
  parseSeccionCodigo,
  parseValorInput,
} from "../src/lib/paginas/validation.mjs";
import {
  buildObjectPath,
  isPaginaObjectPath,
  paginaMediaTarget,
} from "../src/lib/media/policy.mjs";

function rejects(fn, pattern) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof PaginaError, "debe ser PaginaError");
    assert.equal(error.status, 400);
    if (pattern) assert.match(error.message, pattern);
    return true;
  });
}

function sql(name) {
  return readFileSync(new URL(`../database-documentacion/${name}`, import.meta.url), "utf8");
}

test("la estructura fija coincide con las secciones sembradas en 020_secciones_pagina.sql", () => {
  const seeded = [...sql("020_secciones_pagina.sql").matchAll(/\(\s*(\d+)\s*,\s*'(\w+)'\s*,\s*(\d+)\s*\)/g)].map(
    (match) => ({ pagina: Number(match[1]), codigo: match[2], orden: Number(match[3]) }),
  );

  assert.equal(seeded.length, 6);

  for (const { pagina, codigo, orden } of seeded) {
    const defs = SECCIONES[pagina];

    assert.ok(defs, `página ${pagina} sin definición`);
    assert.equal(defs[orden - 1]?.codigo, codigo, `orden de ${codigo}`);
  }

  assert.equal(Object.values(SECCIONES).flat().length, seeded.length);
});

test("la estructura fija coincide con los campos sembrados en 021_campos_seccion.sql", () => {
  // Cada fila semilla es (id_pagina, 'codigo_seccion', 'codigo_campo', 'valor').
  const seeded = [...sql("021_campos_seccion.sql").matchAll(/\(\s*(\d+)\s*,\s*'(\w+)'\s*,\s*'(\w+)'\s*,/g)];
  const defined = new Set(
    Object.entries(SECCIONES).flatMap(([pagina, defs]) =>
      defs.flatMap((seccion) =>
        seccion.campos.map((campo) => `${pagina}.${seccion.codigo}.${campo.codigo}`),
      ),
    ),
  );
  const fromSql = new Set(seeded.map((match) => `${match[1]}.${match[2]}.${match[3]}`));

  assert.equal(fromSql.size, 14);
  assert.deepEqual([...fromSql].sort(), [...defined].sort());
});

test("las listas viven en las secciones que validan los triggers", () => {
  assert.equal(SECCION_DE_LISTA.valores.codigo, "valores");
  assert.equal(SECCION_DE_LISTA.integrantes.codigo, "directorio");
  assert.match(sql("022_valores.sql"), /'valores'/);
  assert.match(sql("024_integrantes_directorio.sql"), /'directorio'/);
});

test("solo existen las páginas Inicio y Quiénes somos", () => {
  assert.deepEqual(PAGINAS.map((pagina) => pagina.id), [1, 2]);
  assert.equal(getPagina(3), null);
  assert.equal(getSeccion(1, "valores"), null);
  assert.equal(parsePaginaId("2"), 2);
  rejects(() => parsePaginaId("3"));
  rejects(() => parsePaginaId("abc"));
  rejects(() => parseSeccionCodigo(1, "directorio"), /sección/);
  assert.equal(parseSeccionCodigo(2, "directorio").codigo, "directorio");
});

test("parseId acepta solo enteros positivos", () => {
  assert.equal(parseId("15"), 15);
  assert.equal(parseId(7), 7);

  for (const value of ["0", "-1", "1.5", "01", "1e3", "", null, undefined, "9999999999", "1 OR 1=1"]) {
    rejects(() => parseId(value));
  }
});

test("los campos solo aceptan códigos existentes, textos y largos válidos", () => {
  const portada = getSeccion(1, "portada");

  assert.deepEqual(
    parseCamposPayload(1, portada, { campos: { titulo: "  Historias\r\n\r\nque   dan\nforma  ", descripcion: "Uno\n\n\n\nDos" } }),
    { titulo: "Historias\nque dan\nforma", descripcion: "Uno\n\nDos" },
  );
  assert.deepEqual(parseCamposPayload(1, portada, { campos: { texto_superior: "Línea 1\nLínea 2" } }), {
    texto_superior: "Línea 1 Línea 2",
  });
  rejects(() => parseCamposPayload(1, portada, { campos: { inventado: "x" } }), /no existe/);
  rejects(() => parseCamposPayload(1, portada, { campos: {} }), /No hay cambios/);
  rejects(() => parseCamposPayload(1, portada, {}), /campos/);
  rejects(() => parseCamposPayload(1, portada, null));
  rejects(() => parseCamposPayload(1, portada, { campos: { titulo: 5 } }), /texto/);
  rejects(() => parseCamposPayload(1, portada, { campos: { titulo: "   " } }), /obligatorio/);
  rejects(() => parseCamposPayload(1, portada, { campos: { texto_superior: "x".repeat(121) } }), /120/);
  rejects(() => parseCamposPayload(1, portada, { campos: { codigo_seccion: "x" } }));
});

test("el título obligatorio de Quiénes somos no puede quedar vacío, los demás sí", () => {
  const mision = getSeccion(2, "presentacion_mision");

  rejects(() => parseCamposPayload(2, mision, { campos: { titulo_pagina: "" } }), /obligatorio/);
  assert.deepEqual(parseCamposPayload(2, mision, { campos: { titulo_mision: "" } }), { titulo_mision: "" });
});

test("el texto se normaliza sin dejar HTML interpretable (React lo escapa al renderizar)", () => {
  assert.equal(normalizeTexto("  a \n b\t c "), "a b c");
  assert.equal(normalizeTitulo("a\n\n  b  \nc\nd\ne"), "a\nb\nc\nd");
  assert.equal(normalizeParrafos("a  \n\n\n\nb\n"), "a\n\nb");
  assert.deepEqual(splitParagraphs("uno\n\n dos \n\n\n\ntres"), ["uno", "dos", "tres"]);
  assert.deepEqual(splitParagraphs(""), []);
  assert.deepEqual(splitParagraphs(undefined), []);
  assert.equal(normalizeTexto("<script>alert(1)</script>"), "<script>alert(1)</script>");
});

test("splitTitleLines respeta saltos explícitos y reparte en tres líneas si no los hay", () => {
  assert.deepEqual(splitTitleLines("Historias que dan forma a Quilpué"), {
    lines: ["Historias que", "dan forma", "a Quilpué"],
    emphasisIndex: 1,
  });
  assert.deepEqual(splitTitleLines("Uno\nDos\nTres"), { lines: ["Uno", "Dos", "Tres"], emphasisIndex: 1 });
  assert.deepEqual(splitTitleLines("Solo un título"), { lines: ["Solo", "un", "título"], emphasisIndex: 1 });
  assert.deepEqual(splitTitleLines("Hola mundo"), { lines: ["Hola mundo"], emphasisIndex: null });
  assert.deepEqual(splitTitleLines(""), { lines: [], emphasisIndex: null });
});

test("valorLayout reproduce la grilla 7/5 · 5/7 y deja el último solo a ancho completo", () => {
  const spans = (total) => Array.from({ length: total }, (_, index) => valorLayout(index, total).span);

  assert.deepEqual(spans(4), ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7"]);
  assert.deepEqual(spans(3), ["md:col-span-7", "md:col-span-5", "md:col-span-12"]);
  assert.deepEqual(spans(1), ["md:col-span-12"]);
  assert.equal(valorLayout(5, 6).preset, 1);
});

test("valores: título obligatorio, texto superior y descripción opcionales", () => {
  assert.deepEqual(parseValorInput({ titulo: " Memoria ", texto_superior: "", descripcion: "x" }), {
    texto_superior: null,
    titulo: "Memoria",
    descripcion: "x",
  });
  assert.deepEqual(parseValorInput({ titulo: "A", texto_superior: "Archivo" }), {
    texto_superior: "Archivo",
    titulo: "A",
    descripcion: "",
  });
  rejects(() => parseValorInput({ titulo: "" }), /obligatorio/);
  rejects(() => parseValorInput({}), /texto/);
  rejects(() => parseValorInput({ titulo: "x".repeat(151) }), /150/);
  rejects(() => parseValorInput({ titulo: "a", texto_superior: "x".repeat(101) }), /100/);
  rejects(() => parseValorInput({ titulo: "a", descripcion: "x".repeat(2001) }), /2000/);
  rejects(() => parseValorInput(null));
});

test("integrantes: cargo por id de catálogo, nombre obligatorio, nunca texto libre de cargo", () => {
  assert.deepEqual(parseIntegranteInput({ id_cargo: "2", nombre_integrante: " Ana Pérez ", descripcion: "" }), {
    id_cargo: 2,
    nombre_integrante: "Ana Pérez",
    descripcion: null,
  });
  assert.equal(parseIntegranteInput({ id_cargo: 3, nombre_integrante: "B", descripcion: "Bio" }).descripcion, "Bio");
  rejects(() => parseIntegranteInput({ nombre_integrante: "Ana" }), /cargo/);
  rejects(() => parseIntegranteInput({ id_cargo: "Presidenta", nombre_integrante: "Ana" }), /cargo/);
  rejects(() => parseIntegranteInput({ id_cargo: 1, nombre_integrante: "" }), /obligatorio/);
  rejects(() => parseIntegranteInput({ id_cargo: 1, nombre_integrante: "x".repeat(151) }), /150/);
});

test("la foto de un integrante es el id de una imagen o null", () => {
  assert.equal(parseImagenIntegrantePayload({ id_imagen: null }), null);
  assert.equal(parseImagenIntegrantePayload({ id_imagen: "7" }), 7);
  rejects(() => parseImagenIntegrantePayload({}), /imagen/);
  rejects(() => parseImagenIntegrantePayload({ id_imagen: "abc" }));
  rejects(() => parseImagenIntegrantePayload({ id_imagen: 0 }));
  rejects(() => parseImagenIntegrantePayload(null));
});

test("el orden exige una lista de ids únicos y válidos", () => {
  assert.deepEqual(parseOrdenPayload({ ids: [3, "1", 2] }), [3, 1, 2]);
  rejects(() => parseOrdenPayload({ ids: [] }), /vacío/);
  rejects(() => parseOrdenPayload({ ids: [1, 1] }), /repetidos/);
  rejects(() => parseOrdenPayload({ ids: "1,2" }), /lista/);
  rejects(() => parseOrdenPayload({ ids: [1, "x"] }));
  rejects(() => parseOrdenPayload({}));
});

test("las imágenes de una sección respetan el máximo definido", () => {
  const portada = getSeccion(1, "portada");
  const presentacion = getSeccion(1, "presentacion");

  assert.deepEqual(parseImagenesSeccionPayload({ ids: [] }, portada), []);
  assert.deepEqual(parseImagenesSeccionPayload({ ids: [1, 2, 3] }, presentacion), [1, 2, 3]);
  rejects(() => parseImagenesSeccionPayload({ ids: [1, 2, 3, 4] }, presentacion), /hasta 3/);
  rejects(() => parseImagenesSeccionPayload({ ids: [1] }, getSeccion(2, "directorio")), /hasta 0/);
  rejects(() => parseImagenesSeccionPayload({ ids: [1, 1] }, portada), /repetidos/);
});

test("la descripción de imagen es opcional y acotada", () => {
  assert.equal(parseImagenDescripcion({ descripcion_imagen: "" }), null);
  assert.equal(parseImagenDescripcion({}), null);
  assert.equal(parseImagenDescripcion({ descripcion_imagen: "  Plaza  " }), "Plaza");
  rejects(() => parseImagenDescripcion({ descripcion_imagen: "x".repeat(301) }), /300/);
  assert.equal(parseDescripcionFormulario(null), null);
  assert.equal(parseDescripcionFormulario("Foto"), "Foto");
});

test("las imágenes de páginas se guardan en paginas/<página>/<sección>/ y solo esas se pueden borrar", () => {
  const target = paginaMediaTarget("quienes-somos", "presentacion_mision");

  assert.deepEqual(target, { folder: "paginas/quienes-somos/presentacion_mision" });

  const path = buildObjectPath(target, "webp");

  assert.match(path, /^paginas\/quienes-somos\/presentacion_mision\/[0-9a-f-]{36}\.webp$/);
  assert.equal(isPaginaObjectPath(path), true);
  assert.equal(paginaMediaTarget("../x", "portada"), null);
  assert.equal(paginaMediaTarget("inicio", "../portada"), null);
  assert.equal(paginaMediaTarget(undefined, "portada"), null);

  for (const protectedPath of [
    "actividades/12/portada/3c203cce-9734-46aa-bf79-732581261dac.png",
    "contenidos/3/portada/e5f43e97-d17c-47ac-a53d-6d2e64c19cf5.jpg",
    "museo/aportes/01cc43ff-c8c3-481e-a15a-f95a2a3ba3c7.png",
    "paginas/inicio/portada/../../actividades/x.png",
    "paginas/inicio/portada/no-uuid.png",
    "",
    null,
  ]) {
    assert.equal(isPaginaObjectPath(protectedPath), false, String(protectedPath));
  }
});

test("helpers de presentación", () => {
  assert.equal(initials("Millaray Demanet"), "MD");
  assert.equal(initials("Ana"), "A");
  assert.equal(initials(""), "");
  assert.equal(normalizeKey("  Angelo  Villagrán "), "angelo villagran");
});
