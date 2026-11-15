/*
  Estructura fija del módulo Gestión de Páginas.

  La base de datos guarda el contenido editable; React decide cómo se presenta.
  Este archivo es la única fuente de qué campos, listas e imágenes existen en
  cada sección. Refleja database-documentacion/019..026 y está verificado contra
  esos SQL en scripts/paginas-validation.test.mjs.

  El frontend no puede crear páginas, secciones ni códigos de campo: todo lo que
  llega al servidor se contrasta con estas definiciones.
*/

export const PAGINA_INICIO = 1;
export const PAGINA_QUIENES_SOMOS = 2;

/** Rutas públicas que dependen del contenido de este módulo. */
export const RUTAS_PUBLICAS = ["/", "/quienes-somos"];

export const PAGINAS = [
  { id: PAGINA_INICIO, slug: "inicio", nombre: "Inicio", ruta: "/" },
  {
    id: PAGINA_QUIENES_SOMOS,
    slug: "quienes-somos",
    nombre: "Quiénes somos",
    ruta: "/quienes-somos",
  },
];

/**
 * Tipos de campo:
 *  - texto:    una sola línea (los saltos de línea se convierten en espacios).
 *  - titulo:   texto corto que admite saltos de línea (la presentación decide estilos).
 *  - parrafos: varios párrafos separados por una línea en blanco.
 */
export const TIPOS_CAMPO = ["texto", "titulo", "parrafos"];

export const MAX_TEXTO = 200;

/**
 * @typedef {Object} CampoDef
 * @property {string} codigo
 * @property {string} etiqueta
 * @property {"texto"|"titulo"|"parrafos"} tipo
 * @property {number} max
 * @property {boolean} [requerido]
 * @property {string} [ayuda]
 */

/**
 * @typedef {Object} SeccionDef
 * @property {string} codigo
 * @property {string} titulo
 * @property {string} descripcion
 * @property {CampoDef[]} campos
 * @property {"valores"|"integrantes"} [lista]
 * @property {{ max: number, ayuda: string }} [imagenes]
 */

/** @type {Record<number, SeccionDef[]>} */
export const SECCIONES = {
  [PAGINA_INICIO]: [
    {
      codigo: "portada",
      titulo: "Portada",
      descripcion: "Lo primero que ve el visitante al entrar al sitio.",
      campos: [
        { codigo: "texto_superior", etiqueta: "Texto superior", tipo: "texto", max: 120 },
        {
          codigo: "titulo",
          etiqueta: "Título completo",
          tipo: "titulo",
          max: 200,
          requerido: true,
          ayuda:
            "Es un único texto. Para controlar los saltos de línea, escribe cada línea por separado: si hay tres, la del medio se destaca.",
        },
        { codigo: "descripcion", etiqueta: "Descripción", tipo: "parrafos", max: 600 },
      ],
      imagenes: {
        max: 8,
        ayuda:
          "Fotografías que rotan al fondo de la portada. La descripción se muestra como pie de foto.",
      },
    },
    {
      codigo: "presentacion",
      titulo: "Presentación",
      descripcion: "Bloque que explica qué es Raíz Quilpué.",
      campos: [
        { codigo: "texto_superior", etiqueta: "Texto superior", tipo: "texto", max: 120 },
        { codigo: "titulo", etiqueta: "Título", tipo: "texto", max: MAX_TEXTO },
        {
          codigo: "contenido",
          etiqueta: "Contenido completo",
          tipo: "parrafos",
          max: 5000,
          ayuda: "Separa los párrafos con una línea en blanco.",
        },
      ],
      imagenes: {
        max: 3,
        ayuda:
          "Hasta tres fotografías: las dos primeras van en formato 4:3 y la tercera es panorámica.",
      },
    },
  ],
  [PAGINA_QUIENES_SOMOS]: [
    {
      codigo: "presentacion_mision",
      titulo: "Presentación y misión",
      descripcion: "Encabezado de la página y texto de la misión.",
      campos: [
        { codigo: "texto_superior", etiqueta: "Texto superior", tipo: "texto", max: 120 },
        {
          codigo: "titulo_pagina",
          etiqueta: "Título de la página",
          tipo: "texto",
          max: 150,
          requerido: true,
        },
        { codigo: "titulo_mision", etiqueta: "Título de la misión", tipo: "texto", max: 250 },
        {
          codigo: "parrafos_mision",
          etiqueta: "Párrafos de la misión",
          tipo: "parrafos",
          max: 8000,
          ayuda: "Separa los párrafos con una línea en blanco.",
        },
      ],
    },
    {
      codigo: "valores",
      titulo: "Valores institucionales",
      descripcion: "Encabezado de la sección y listado de valores.",
      campos: [
        { codigo: "titulo_seccion", etiqueta: "Título de la sección", tipo: "texto", max: 150 },
      ],
      lista: "valores",
    },
    {
      codigo: "directorio",
      titulo: "Directorio",
      descripcion: "Encabezado de la sección y personas que integran el directorio.",
      campos: [
        { codigo: "titulo_seccion", etiqueta: "Título de la sección", tipo: "texto", max: 150 },
      ],
      lista: "integrantes",
    },
    {
      codigo: "cierre",
      titulo: "Cierre",
      descripcion: "Cita final de la página.",
      campos: [
        { codigo: "titulo_cierre", etiqueta: "Texto superior de la cita", tipo: "texto", max: 120 },
        {
          codigo: "contenido_cierre",
          etiqueta: "Cita",
          tipo: "parrafos",
          max: 1000,
        },
      ],
    },
  ],
};

/** Límites de las listas administrables (columnas de valores / integrantes_directorio). */
export const LIMITES = {
  valores: { texto_superior: 100, titulo: 150, descripcion: 2000, max_items: 12 },
  integrantes: { nombre: 150, descripcion: 2000, max_items: 20 },
  imagen: { descripcion: 300 },
};

export function getPagina(idPagina) {
  return PAGINAS.find((pagina) => pagina.id === Number(idPagina)) ?? null;
}

export function getSecciones(idPagina) {
  return SECCIONES[Number(idPagina)] ?? [];
}

export function getSeccion(idPagina, codigo) {
  return getSecciones(idPagina).find((seccion) => seccion.codigo === codigo) ?? null;
}

export function getCampo(idPagina, codigoSeccion, codigoCampo) {
  return (
    getSeccion(idPagina, codigoSeccion)?.campos.find(
      (campo) => campo.codigo === codigoCampo,
    ) ?? null
  );
}

/** Sección de Quiénes somos que aloja cada lista (la valida un trigger en la base). */
export const SECCION_DE_LISTA = {
  valores: { idPagina: PAGINA_QUIENES_SOMOS, codigo: "valores" },
  integrantes: { idPagina: PAGINA_QUIENES_SOMOS, codigo: "directorio" },
};
