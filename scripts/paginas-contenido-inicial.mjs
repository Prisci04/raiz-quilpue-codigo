/*
  Carga el contenido que hoy muestra el sitio en los campos de Gestión de Páginas.

  - Solo actualiza `valor` de campos_seccion que ya existen (no crea nada).
  - Solo escribe un campo si está vacío o si conserva el texto semilla de los SQL
    (database-documentacion/021): nunca pisa un texto que alguien ya editó.
  - Es idempotente: volver a ejecutarlo no cambia nada.

  Uso: node scripts/paginas-contenido-inicial.mjs [--dry-run]
*/
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv(path) {
  const env = {};

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }

  return env;
}

const env = loadEnv(".env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

/** codigo de sección → campo → { valor nuevo, textos semilla que se pueden reemplazar } */
const CONTENIDO = {
  portada: {
    texto_superior: { valor: "Museo Digital · Quilpué, Chile" },
    descripcion: { valor: "Un espacio donde las historias mantienen vivas nuestras raíces." },
  },
  presentacion: {
    texto_superior: { valor: "¿Qué es Raíz Quilpué?" },
    titulo: {
      valor: "Raíz Quilpué es una corporación cultural e histórica",
      semilla: ["¿Qué es Raíz Quilpué?"],
    },
    contenido: {
      valor: [
        "Somos un espacio para encontrarnos con las historias, saberes, lugares, personas y expresiones que forman parte de nuestra identidad local, conectando el patrimonio con la comunidad y el territorio.",
        "Dedicada a investigar, rescatar, difundir y construir participativamente la memoria histórica y cultural de Quilpué.",
      ].join("\n\n"),
    },
  },
  presentacion_mision: {
    titulo_mision: {
      valor: "Corporación para la cultura e historia quilpueina Raíz Quilpué",
      semilla: ["Nuestra misión"],
    },
    parrafos_mision: {
      valor: [
        "Raíz Quilpué es una corporación cultural e histórica sin fines de lucro que nace desde el territorio con el propósito de rescatar, preservar y difundir la historia, la cultura y la identidad quilpueína.",
        "Creemos que la identidad local se construye a partir de las historias, recuerdos, experiencias y expresiones culturales de quienes habitan la ciudad. Por ello, promovemos espacios de encuentro, participación y creación colectiva que fortalezcan el vínculo entre las personas y su territorio, mediante actividades comunitarias, intervenciones públicas, iniciativas patrimoniales, proyectos artísticos y acciones de difusión cultural, los cuales tienen el objetivo principal de contribuir al desarrollo de una comunidad más conectada, participativa y consciente de su historia.",
        "Nuestro trabajo se proyecta hacia la creación de un museo y centro cultural comunitario de Quilpué, concebido como un espacio abierto para la memoria, el arte, la educación y la participación ciudadana.",
      ].join("\n\n"),
    },
  },
  valores: {
    titulo_seccion: { valor: "Lo que nos guía", semilla: ["Nuestros valores"] },
  },
  cierre: {
    titulo_cierre: { valor: "Raíz Quilpué" },
    contenido_cierre: {
      valor:
        "Preservar la memoria es mantener vivo el vínculo entre quienes fuimos, quienes somos y quienes vendrán.",
    },
  },
};

const { data: secciones, error: seccionesError } = await supabase
  .from("secciones_pagina")
  .select("id_seccion, codigo_seccion, campos_seccion ( codigo_campo, valor )");

if (seccionesError) throw seccionesError;

let cambios = 0;

for (const [codigoSeccion, campos] of Object.entries(CONTENIDO)) {
  const seccion = secciones.find((item) => item.codigo_seccion === codigoSeccion);

  if (!seccion) {
    console.log(`SALTA  sección ${codigoSeccion}: no existe`);
    continue;
  }

  for (const [codigoCampo, { valor, semilla = [] }] of Object.entries(campos)) {
    const actual = seccion.campos_seccion.find((campo) => campo.codigo_campo === codigoCampo);

    if (!actual) {
      console.log(`SALTA  ${codigoSeccion}.${codigoCampo}: el campo no existe`);
      continue;
    }

    if (actual.valor === valor) {
      console.log(`IGUAL  ${codigoSeccion}.${codigoCampo}`);
      continue;
    }

    if (actual.valor.trim() !== "" && !semilla.includes(actual.valor)) {
      console.log(`RESPETA ${codigoSeccion}.${codigoCampo}: ya tiene contenido propio`);
      continue;
    }

    console.log(`ACTUALIZA ${codigoSeccion}.${codigoCampo}: "${actual.valor}" → "${valor.slice(0, 60)}…"`);
    cambios += 1;

    if (!DRY_RUN) {
      const { error } = await supabase
        .from("campos_seccion")
        .update({ valor })
        .eq("id_seccion", seccion.id_seccion)
        .eq("codigo_campo", codigoCampo);

      if (error) throw error;
    }
  }
}

console.log(DRY_RUN ? `Simulación: ${cambios} cambio(s) pendientes.` : `Listo: ${cambios} campo(s) actualizados.`);
