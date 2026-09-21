import { NextResponse } from "next/server";

const institucional = {
  hero: {
    eyebrow: "Raíz Quilpué",
    titulo: "Quiénes somos",
    descripcion:
      "Un proyecto cultural dedicado a preservar, investigar y compartir la memoria, el patrimonio y la identidad de Quilpué.",
  },

  mision: {
    eyebrow: "Nuestra misión",
    titulo: "Preservar la memoria para fortalecer nuestra identidad",
    descripcion:
      "Raíz Quilpué nace desde el interés por reconocer, conservar y difundir el patrimonio material e inmaterial de la comuna. Nuestro propósito es acercar la historia local a las personas, generando un espacio donde fotografías, relatos, documentos y experiencias puedan mantenerse vivos y disponibles para nuevas generaciones.",
    descripcionSecundaria:
      "A través de herramientas digitales, investigación y participación comunitaria buscamos construir un archivo vivo que permita conocer Quilpué desde las voces, recuerdos y experiencias de quienes forman parte de su territorio.",
    imagen: "/images/contenido/archivo-historico.jpg",
  },

  vision: {
    eyebrow: "Nuestra visión",
    titulo: "Una memoria accesible, participativa y viva",
    descripcion:
      "Aspiramos a consolidar un espacio cultural digital donde la comunidad pueda descubrir, aportar y compartir contenidos relacionados con la historia y el patrimonio de Quilpué, fortaleciendo el vínculo entre las personas y su territorio.",
  },

  valores: [
    {
      numero: "01",
      titulo: "Memoria",
      descripcion:
        "Reconocemos las historias y testimonios locales como parte fundamental de la identidad de Quilpué.",
    },
    {
      numero: "02",
      titulo: "Comunidad",
      descripcion:
        "Promovemos la participación y el encuentro entre quienes construyen diariamente la historia de la comuna.",
    },
    {
      numero: "03",
      titulo: "Rigor",
      descripcion:
        "Trabajamos con respeto por las fuentes, documentos, relatos y antecedentes que forman nuestro patrimonio.",
    },
    {
      numero: "04",
      titulo: "Innovación",
      descripcion:
        "Utilizamos herramientas digitales para ampliar el acceso a la cultura, la memoria y el conocimiento local.",
    },
  ],

  lineasTrabajo: [
    {
      titulo: "Patrimonio",
      descripcion:
        "Investigamos y difundimos elementos relevantes del patrimonio material e inmaterial de Quilpué.",
    },
    {
      titulo: "Archivo vivo",
      descripcion:
        "Reunimos fotografías, documentos, testimonios y relatos que contribuyen a preservar la memoria de la comuna.",
    },
    {
      titulo: "Participación comunitaria",
      descripcion:
        "Promovemos espacios donde la comunidad pueda participar, compartir experiencias y aportar a la construcción de memoria local.",
    },
    {
      titulo: "Difusión digital",
      descripcion:
        "Transformamos contenidos culturales en experiencias accesibles mediante plataformas y herramientas digitales.",
    },
  ],

  plataforma: [
    {
      titulo: "Información centralizada",
      descripcion:
        "Los contenidos culturales e institucionales se organizan desde una plataforma común para facilitar su gestión y consulta.",
    },
    {
      titulo: "Contenido dinámico",
      descripcion:
        "La plataforma está preparada para integrar información administrada desde servicios y fuentes de datos externas.",
    },
    {
      titulo: "Experiencia conectada",
      descripcion:
        "Las distintas áreas del sitio comparten información y servicios manteniendo una experiencia coherente para la comunidad.",
    },
  ],

  equipo: [
    {
      nombre: "Millaray D.",
      cargo: "Presidenta",
      descripcion:
        "Representación institucional y orientación general de Raíz Quilpué, promoviendo el desarrollo y difusión de iniciativas vinculadas con la memoria y el patrimonio local.",
      imagen: null,
      confirmado: true,
    },
    {
      nombre: "Nombre por confirmar",
      cargo: "Coordinación cultural",
      descripcion:
        "Coordinación de actividades, contenidos culturales y vinculación con iniciativas relacionadas con el territorio.",
      imagen: null,
      confirmado: false,
    },
    {
      nombre: "Nombre por confirmar",
      cargo: "Patrimonio y archivo",
      descripcion:
        "Apoyo en investigación, organización documental y construcción del archivo patrimonial de la organización.",
      imagen: null,
      confirmado: false,
    },
    {
      nombre: "Nombre por confirmar",
      cargo: "Comunidad y difusión",
      descripcion:
        "Vinculación comunitaria y apoyo en la difusión de actividades, contenidos e iniciativas culturales.",
      imagen: null,
      confirmado: false,
    },
  ],
};

export async function GET() {
  return NextResponse.json(institucional);
}