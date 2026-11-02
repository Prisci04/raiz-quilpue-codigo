import assert from "node:assert/strict";
import test from "node:test";

import { parseDocumento, stripPastedTextColors } from "../src/lib/contenidos/documento.mjs";
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

const catalogos = {
  tipo_contenido: [
    { id: 1, nombre: "Noticia" },
    { id: 2, nombre: "Patrimonio" },
    { id: 3, nombre: "Cápsula histórica" },
    { id: 4, nombre: "Cultura" },
    { id: 5, nombre: "Comunidad" },
  ],
  estado_publicacion: [
    { id: 1, nombre: "Borrador" },
    { id: 2, nombre: "Publicada" },
  ],
};

const base = {
  titulo: " Título ",
  descripcion: " Texto de la tarjeta ",
  resumen: " Texto del popup ",
  id_tipo_contenido: 1,
  id_estado: 1,
  contenido: doc,
};

test("crea normalizando texto y dejando el café por defecto sin marca", () => {
  const parsed = parseCreateContenido(base, catalogos);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.titulo, "Título");
  assert.equal(parsed.value.id_tipo_contenido, 1);
  assert.equal(parsed.value.id_estado, 1);
  assert.equal(parsed.value.imagen_url, null);
  assert.deepEqual(parsed.value.contenido.content[1].content[0].marks, [{ type: "bold" }]);
});

test("rechaza contenido inválido y h1", () => {
  assert.equal(parseCreateContenido({ ...base, contenido: { type: "html" } }, catalogos).ok, false);
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
  assert.equal(parseCreateContenido({ ...base, id_tipo_contenido: 99 }, catalogos).ok, false);
  assert.equal(parseCreateContenido({ ...base, titulo: "   " }, catalogos).ok, false);
});

test("acepta un color hex libre y convierte el café por defecto en texto sin marca", () => {
  const free = parseDocumento({
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
  });
  assert.equal(free.ok, true);
  assert.equal(free.value.content[0].content[0].marks[0].attrs.color, "#ff00ff");

  const def = parseDocumento({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Café",
            marks: [{ type: "textStyle", attrs: { color: "#704A31" } }],
          },
        ],
      },
    ],
  });
  assert.equal(def.ok, true);
  assert.equal(def.value.content[0].content[0].marks, undefined);

  const invalid = parseDocumento({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Pegado",
            marks: [{ type: "bold" }, { type: "textStyle", attrs: { color: "red" } }],
          },
        ],
      },
    ],
  });
  assert.equal(invalid.ok, true);
  assert.deepEqual(invalid.value.content[0].content[0].marks, [{ type: "bold" }]);

  const rgb = parseDocumento({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Rgb",
            marks: [{ type: "textStyle", attrs: { color: "rgb(104, 122, 66)" } }],
          },
        ],
      },
    ],
  });
  assert.equal(rgb.ok, true);
  assert.equal(rgb.value.content[0].content[0].marks[0].attrs.color, "#687a42");
});

test("al pegar HTML se quitan los colores de origen", () => {
  const html = '<p><span style="color: #ff00ff; font-weight: bold">Hola</span> <font color="red">mundo</font></p>';
  const cleaned = stripPastedTextColors(html);
  assert.equal(cleaned.includes("color"), false);
  assert.equal(cleaned.includes("font-weight: bold"), true);
});

test("el cambio de estado solo acepta el campo estado", () => {
  assert.equal(parseEstadoContenido({ estado: "publicada" }, catalogos).value.id_estado, 2);
  assert.equal(parseEstadoContenido({ estado: "Publicada" }, catalogos).value.id_estado, 2);
  assert.equal(parseEstadoContenido({ estado: "oculta" }, catalogos).ok, false);
  assert.equal(parseEstadoContenido({ estado: "borrador", titulo: "x" }, catalogos).ok, false);
});

test("editar puede omitir la portada", () => {
  const parsed = parseUpdateContenido(base, catalogos);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.imagen_url, undefined);
});
