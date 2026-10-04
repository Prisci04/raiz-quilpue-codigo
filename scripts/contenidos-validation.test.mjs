import assert from "node:assert/strict";
import test from "node:test";

import { parseDocumento } from "../src/lib/contenidos/documento.mjs";
import {
  parseCreateContenido,
  parseEstadoContenido,
  parseUpdateContenido,
} from "../src/lib/contenidos/validation.mjs";

const doc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Ferrocarril" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Historia local",
          marks: [
            { type: "bold" },
            { type: "textStyle", attrs: { color: "#704A31" } },
          ],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Estación" }],
            },
          ],
        },
      ],
    },
  ],
};

const base = {
  titulo: " Título ",
  descripcion: " Texto de la tarjeta ",
  resumen: " Texto del popup ",
  tipo: "noticia",
  estado: "borrador",
  contenido: doc,
};

test("crea normalizando texto y color permitido", () => {
  const parsed = parseCreateContenido(base);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.titulo, "Título");
  assert.equal(parsed.value.imagen_url, null);
  assert.equal(parsed.value.contenido.content[1].content[0].marks[1].attrs.color, "#704a31");
});

test("rechaza contenido inválido, h1 y color libre", () => {
  assert.equal(parseCreateContenido({ ...base, contenido: { type: "html" } }).ok, false);
  assert.equal(
    parseDocumento({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "No" }],
        },
      ],
    }).ok,
    false,
  );
  assert.equal(
    parseDocumento({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Color",
              marks: [{ type: "textStyle", attrs: { color: "#ff00ff" } }],
            },
          ],
        },
      ],
    }).ok,
    false,
  );
  assert.equal(parseCreateContenido({ ...base, tipo: "Patrimonio" }).ok, false);
  assert.equal(parseCreateContenido({ ...base, titulo: "   " }).ok, false);
});

test("el cambio de estado solo acepta el campo estado", () => {
  assert.equal(parseEstadoContenido({ estado: "publicada" }).value.estado, "publicada");
  assert.equal(parseEstadoContenido({ estado: "oculta" }).ok, false);
  assert.equal(parseEstadoContenido({ estado: "borrador", titulo: "x" }).ok, false);
});

test("editar puede omitir la portada", () => {
  const parsed = parseUpdateContenido(base);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.imagen_url, undefined);
});
