/*
  Registra en Gestión de Páginas las imágenes que hoy muestra el sitio (carrusel de
  Inicio, imágenes de la presentación y fotos del directorio) para que aparezcan en
  el editor. Las fotos del directorio se asocian por nombre en integrantes_directorio.id_imagen.

  - COPIA cada archivo de /public/images a Storage (public-media) bajo
    paginas/<pagina>/<seccion>/<uuid>.<ext>. No borra, mueve ni reemplaza nada.
  - Registra la imagen en `imagenes` y la asocia en `imagenes_seccion`.
  - Solo asocia a secciones que NO tienen imágenes: nunca pisa una selección hecha
    desde el panel.
  - Idempotente (el nombre del objeto se deriva del archivo de origen).
  - Estas copias nunca se eliminan físicamente desde el panel (no tienen nombre UUID).

  Uso: node scripts/paginas-imagenes-iniciales.mjs [--dry-run]
*/
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET = "public-media";

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** pagina → sección → imágenes actuales del sitio, en su orden actual. */
const IMAGENES = [
  {
    paginaId: 1,
    slug: "inicio",
    seccion: "portada",
    items: [
      { origen: "public/images/inicio/imagen-carrusel1.jpg", descripcion: "Calle comercial de Quilpué" },
      { origen: "public/images/contenido/iglesia desde plaza.jpg", descripcion: "Plaza e Iglesia de Quilpué" },
      { origen: "public/images/contenido/carozzi.jpeg", descripcion: "Compañía Carozzi en Quilpué" },
    ],
  },
  {
    paginaId: 1,
    slug: "inicio",
    seccion: "presentacion",
    items: [
      { origen: "public/images/inicio/imgini5.jpg", descripcion: "Patrimonio de Quilpué" },
      { origen: "public/images/inicio/imgini6.jpg", descripcion: "Historia de Quilpué" },
      { origen: "public/images/inicio/imgini8.jpg", descripcion: "Paisaje de Quilpué" },
    ],
  },
];

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

/*
  Nombre estable derivado del archivo de origen. A propósito NO es un UUID: el panel
  solo elimina físicamente archivos con nombre UUID (los que sube el propio panel),
  así que estas copias iniciales nunca se borran de Storage al quitarlas de una sección.
*/
function nombreEstable(texto) {
  return `inicial-${createHash("sha1").update(texto).digest("hex").slice(0, 16)}`;
}

function fallar(contexto, error) {
  console.error(`ERROR en ${contexto}:`, error?.message ?? error);
  process.exit(1);
}

let cambios = 0;

for (const grupo of IMAGENES) {
  const { data: seccion, error: errSeccion } = await supabase
    .from("secciones_pagina")
    .select("id_seccion")
    .eq("id_pagina", grupo.paginaId)
    .eq("codigo_seccion", grupo.seccion)
    .single();

  if (errSeccion) fallar(`sección ${grupo.seccion}`, errSeccion);

  const { count, error: errCount } = await supabase
    .from("imagenes_seccion")
    .select("id_imagen", { count: "exact", head: true })
    .eq("id_seccion", seccion.id_seccion);

  if (errCount) fallar(`conteo ${grupo.seccion}`, errCount);

  if (count > 0) {
    console.log(`= ${grupo.slug}/${grupo.seccion}: ya tiene ${count} imagen(es), no se modifica`);
    continue;
  }

  const relaciones = [];

  for (const [index, item] of grupo.items.entries()) {
    const extension = extname(item.origen).toLowerCase();
    const mime = MIME[extension];
    const ext = extension === ".jpeg" ? "jpg" : extension.slice(1);
    const ruta = `paginas/${grupo.slug}/${grupo.seccion}/${nombreEstable(item.origen)}.${ext}`;

    if (DRY_RUN) {
      console.log(`+ (simulado) ${item.origen} → ${ruta}`);
      continue;
    }

    const { error: errSubida } = await supabase.storage
      .from(BUCKET)
      .upload(ruta, readFileSync(item.origen), { contentType: mime, upsert: false });

    if (errSubida && !/already exists|Duplicate/i.test(errSubida.message)) {
      fallar(`subida de ${item.origen}`, errSubida);
    }

    const { data: existente } = await supabase
      .from("imagenes")
      .select("id_imagen")
      .eq("bucket", BUCKET)
      .eq("ruta_imagen", ruta)
      .maybeSingle();

    let idImagen = existente?.id_imagen;

    if (!idImagen) {
      const { data: nueva, error: errInsert } = await supabase
        .from("imagenes")
        .insert({ bucket: BUCKET, ruta_imagen: ruta, descripcion_imagen: item.descripcion })
        .select("id_imagen")
        .single();

      if (errInsert) fallar(`registro de ${ruta}`, errInsert);
      idImagen = nueva.id_imagen;
    }

    relaciones.push({ id_seccion: seccion.id_seccion, id_imagen: idImagen, orden: index + 1 });
    console.log(`+ ${item.origen} → ${ruta}`);
    cambios += 1;
  }

  if (!DRY_RUN && relaciones.length) {
    const { error: errRel } = await supabase.from("imagenes_seccion").insert(relaciones);
    if (errRel) fallar(`asociación ${grupo.seccion}`, errRel);
  }
}

/* ------------------------- Fotografías del directorio ------------------------- */

const FOTOS_DIRECTORIO = [
  { nombre: "Millaray Demanet", origen: "public/images/quienes-somos/Presidenta.png" },
  { nombre: "Angelo Villagrán", origen: "public/images/quienes-somos/Vicepresidente.png" },
  { nombre: "Melissa Pacheco", origen: "public/images/quienes-somos/Tesorera.png" },
  { nombre: "Cristina Callejas", origen: "public/images/quienes-somos/Secretaria.png" },
];

for (const foto of FOTOS_DIRECTORIO) {
  const { data: integrante, error: errIntegrante } = await supabase
    .from("integrantes_directorio")
    .select("id_integrante, id_imagen")
    .eq("nombre_integrante", foto.nombre)
    .maybeSingle();

  if (errIntegrante) fallar(`integrante ${foto.nombre}`, errIntegrante);

  if (!integrante) {
    console.log(`= ${foto.nombre}: no existe en el directorio, se omite`);
    continue;
  }

  if (integrante.id_imagen) {
    console.log(`= ${foto.nombre}: ya tiene fotografía, no se modifica`);
    continue;
  }

  const extension = extname(foto.origen).toLowerCase();
  const ruta = `paginas/quienes-somos/directorio/${nombreEstable(foto.origen)}.${extension.slice(1)}`;

  if (DRY_RUN) {
    console.log(`+ (simulado) ${foto.origen} → ${ruta}`);
    continue;
  }

  const { error: errSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, readFileSync(foto.origen), { contentType: MIME[extension], upsert: false });

  if (errSubida && !/already exists|Duplicate/i.test(errSubida.message)) {
    fallar(`subida de ${foto.origen}`, errSubida);
  }

  const { data: existente } = await supabase
    .from("imagenes")
    .select("id_imagen")
    .eq("bucket", BUCKET)
    .eq("ruta_imagen", ruta)
    .maybeSingle();

  let idImagen = existente?.id_imagen;

  if (!idImagen) {
    const { data: nueva, error: errInsert } = await supabase
      .from("imagenes")
      .insert({ bucket: BUCKET, ruta_imagen: ruta, descripcion_imagen: `Fotografía de ${foto.nombre}` })
      .select("id_imagen")
      .single();

    if (errInsert) fallar(`registro de ${ruta}`, errInsert);
    idImagen = nueva.id_imagen;
  }

  const { error: errAsignar } = await supabase
    .from("integrantes_directorio")
    .update({ id_imagen: idImagen })
    .eq("id_integrante", integrante.id_integrante);

  if (errAsignar) fallar(`asignación de ${foto.nombre}`, errAsignar);

  console.log(`+ ${foto.nombre} ← ${ruta}`);
  cambios += 1;
}

console.log(DRY_RUN ? "Simulación terminada." : `Listo: ${cambios} imagen(es) registradas.`);
