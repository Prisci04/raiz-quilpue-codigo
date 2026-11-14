import "server-only";

import { logInternalError } from "@/lib/http";
import {
  LIMITES,
  SECCION_DE_LISTA,
  getPagina,
  getSecciones,
} from "@/lib/paginas/estructura.mjs";
import { notFound, validation } from "@/lib/paginas/errors.mjs";
import {
  MEDIA_BUCKET,
  buildObjectPath,
  isPaginaObjectPath,
  paginaMediaTarget,
} from "@/lib/media/policy.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { deleteImage, uploadImage } from "@/services/storage.service";

/*
  Gestión de Páginas.

  - Lectura pública: cliente con clave publicable (RLS de solo lectura).
  - Lectura/escritura administrativa: cliente service_role, solo desde rutas que
    ya validaron sesión y rol.
  - Una sola consulta con relaciones embebidas arma cada página (sin N+1).
  - supabase-js no ofrece transacciones multi-sentencia y no se permite crear
    funciones SQL nuevas, así que cada operación compuesta se ordena para que un
    fallo parcial nunca pierda datos (primero se inserta/actualiza, al final se borra).
*/

/**
 * @typedef {{ id: number, url: string, ruta: string, descripcion: string | null }} ImagenSeccion
 * @typedef {{ id: number, texto_superior: string | null, titulo: string, descripcion: string, orden: number }} Valor
 * @typedef {{
 *   id: number, id_cargo: number, cargo: string, nombre: string,
 *   descripcion: string | null, orden: number, imagen: ImagenSeccion | null
 * }} Integrante
 * @typedef {{
 *   id: number | null, codigo: string, campos: Record<string, string>,
 *   imagenes: ImagenSeccion[], valores: Valor[], integrantes: Integrante[]
 * }} SeccionContenido
 * @typedef {{ id: number, nombre: string, ruta: string, secciones: Record<string, SeccionContenido> }} PaginaContenido
 */

const SELECT_PAGINA = `
  id_pagina,
  nombre_pagina,
  secciones_pagina (
    id_seccion,
    codigo_seccion,
    orden,
    campos_seccion ( codigo_campo, valor ),
    imagenes_seccion (
      orden,
      imagenes ( id_imagen, bucket, ruta_imagen, descripcion_imagen )
    ),
    valores ( id_valor, texto_superior, titulo, descripcion, orden ),
    integrantes_directorio (
      id_integrante, id_cargo, nombre_integrante, descripcion, orden, id_imagen,
      cargos_organizacion ( nombre_cargo ),
      imagenes ( id_imagen, bucket, ruta_imagen, descripcion_imagen )
    )
  )
`;

const COLUMNAS_IMAGEN = "id_imagen, bucket, ruta_imagen, descripcion_imagen";

const porOrden = (a, b) => a.orden - b.orden || a.id - b.id;

function uno(value) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function urlPublica(client, bucket, ruta) {
  return client.storage.from(bucket).getPublicUrl(ruta).data?.publicUrl ?? null;
}

function mapImagen(client, row) {
  if (!row || row.bucket !== MEDIA_BUCKET) return null;

  const url = urlPublica(client, row.bucket, row.ruta_imagen);
  if (!url) return null;

  return {
    id: row.id_imagen,
    url,
    ruta: row.ruta_imagen,
    descripcion: row.descripcion_imagen ?? null,
  };
}

/** Filas de imagenes_seccion (con `imagenes` embebida) → imágenes en el orden de la sección. */
function imagenesOrdenadas(client, filas) {
  return (filas ?? [])
    .map((fila) => ({ orden: fila.orden, imagen: mapImagen(client, uno(fila.imagenes)) }))
    .filter((item) => item.imagen)
    .sort((a, b) => a.orden - b.orden || a.imagen.id - b.imagen.id)
    .map((item) => item.imagen);
}

function mapValor(row) {
  return {
    id: row.id_valor,
    texto_superior: row.texto_superior ?? null,
    titulo: row.titulo,
    descripcion: row.descripcion ?? "",
    orden: row.orden,
  };
}

function mapIntegrante(row, client) {
  return {
    id: row.id_integrante,
    id_cargo: row.id_cargo,
    cargo: uno(row.cargos_organizacion)?.nombre_cargo ?? "",
    nombre: row.nombre_integrante,
    descripcion: row.descripcion ?? null,
    orden: row.orden,
    imagen: mapImagen(client, uno(row.imagenes)),
  };
}

function mapSeccion(client, def, fila) {
  const guardados = new Map(
    (fila?.campos_seccion ?? []).map((campo) => [campo.codigo_campo, campo.valor]),
  );

  return {
    id: fila?.id_seccion ?? null,
    codigo: def.codigo,
    campos: Object.fromEntries(
      def.campos.map((campo) => [campo.codigo, guardados.get(campo.codigo) ?? ""]),
    ),
    imagenes: imagenesOrdenadas(client, fila?.imagenes_seccion),
    valores: (fila?.valores ?? []).map(mapValor).sort(porOrden),
    integrantes: (fila?.integrantes_directorio ?? [])
      .map((integrante) => mapIntegrante(integrante, client))
      .sort(porOrden),
  };
}

/** @returns {PaginaContenido} */
function mapPagina(client, row) {
  const pagina = getPagina(row.id_pagina);
  const secciones = {};

  for (const def of getSecciones(row.id_pagina)) {
    const fila = (row.secciones_pagina ?? []).find(
      (seccion) => seccion.codigo_seccion === def.codigo,
    );

    secciones[def.codigo] = mapSeccion(client, def, fila);
  }

  return {
    id: row.id_pagina,
    nombre: row.nombre_pagina ?? pagina?.nombre ?? "",
    ruta: pagina?.ruta ?? "/",
    secciones,
  };
}

async function leerPagina(client, idPagina) {
  const { data, error } = await client
    .from("paginas")
    .select(SELECT_PAGINA)
    .eq("id_pagina", idPagina)
    .maybeSingle();

  if (error) throw error;

  return data ? mapPagina(client, data) : null;
}

/** Contenido público de una página (lo consumen las páginas del sitio). */
export async function getPaginaPublica(idPagina) {
  return leerPagina(getSupabaseServerClient(), idPagina);
}

/** Contenido de una página más los catálogos que necesita el editor. */
export async function getPaginaEdicion(idPagina) {
  const admin = getSupabaseAdminClient();
  const [pagina, cargos] = await Promise.all([
    leerPagina(admin, idPagina),
    admin
      .from("cargos_organizacion")
      .select("id_cargo, nombre_cargo")
      .order("id_cargo", { ascending: true }),
  ]);

  if (cargos.error) throw cargos.error;
  if (!pagina) return null;

  return {
    ...pagina,
    cargos: (cargos.data ?? []).map((cargo) => ({
      id: cargo.id_cargo,
      nombre: cargo.nombre_cargo,
    })),
  };
}

function traducirError(error) {
  if (error?.code === "23503") {
    throw validation("Alguno de los datos seleccionados ya no existe.");
  }

  if (error?.code === "23514") {
    throw validation("Hay datos que no cumplen las reglas del sitio.");
  }

  throw error;
}

async function resolverSeccionId(idPagina, codigo) {
  const { data, error } = await getSupabaseAdminClient()
    .from("secciones_pagina")
    .select("id_seccion")
    .eq("id_pagina", idPagina)
    .eq("codigo_seccion", codigo)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound("La sección no existe en la base de datos.");

  return data.id_seccion;
}

/* ---------------------------------- Campos ---------------------------------- */

async function leerCampos(idSeccion) {
  const { data, error } = await getSupabaseAdminClient()
    .from("campos_seccion")
    .select("codigo_campo, valor")
    .eq("id_seccion", idSeccion);

  if (error) throw error;

  return new Map((data ?? []).map((campo) => [campo.codigo_campo, campo.valor]));
}

/**
 * Actualiza únicamente `valor` de campos que ya existen (la tabla no admite altas
 * desde la aplicación). Si algún código no existe en la base no se modifica nada.
 */
export async function updateCamposSeccion(idPagina, seccionDef, campos) {
  const idSeccion = await resolverSeccionId(idPagina, seccionDef.codigo);
  const existentes = await leerCampos(idSeccion);

  for (const codigo of Object.keys(campos)) {
    if (!existentes.has(codigo)) {
      throw notFound(`El campo "${codigo}" no está registrado en la base de datos.`);
    }
  }

  const cambios = Object.entries(campos).filter(([codigo, valor]) => existentes.get(codigo) !== valor);

  const resultados = await Promise.all(
    cambios.map(([codigo, valor]) =>
      getSupabaseAdminClient()
        .from("campos_seccion")
        .update({ valor })
        .eq("id_seccion", idSeccion)
        .eq("codigo_campo", codigo)
        .select("codigo_campo"),
    ),
  );

  for (const { error } of resultados) {
    if (error) traducirError(error);
  }

  const actuales = await leerCampos(idSeccion);

  return Object.fromEntries(
    seccionDef.campos.map((campo) => [campo.codigo, actuales.get(campo.codigo) ?? ""]),
  );
}

/* ------------------------- Listas ordenables (CRUD) -------------------------- */

const LISTAS = {
  valores: {
    tabla: "valores",
    pk: "id_valor",
    columnas: "id_valor, id_seccion, texto_superior, titulo, descripcion, orden",
    map: mapValor,
    max: LIMITES.valores.max_items,
    nombre: "valores",
  },
  integrantes: {
    tabla: "integrantes_directorio",
    pk: "id_integrante",
    columnas: `id_integrante, id_seccion, id_cargo, nombre_integrante, descripcion, orden, id_imagen,
      cargos_organizacion ( nombre_cargo ), imagenes ( ${COLUMNAS_IMAGEN} )`,
    map: mapIntegrante,
    max: LIMITES.integrantes.max_items,
    nombre: "integrantes",
  },
};

async function filasLista(lista, idSeccion, columnas = lista.columnas) {
  const { data, error } = await getSupabaseAdminClient()
    .from(lista.tabla)
    .select(columnas)
    .eq("id_seccion", idSeccion)
    .order("orden", { ascending: true })
    .order(lista.pk, { ascending: true });

  if (error) throw error;

  return data ?? [];
}

async function itemsLista(lista, idSeccion) {
  const client = getSupabaseAdminClient();

  return (await filasLista(lista, idSeccion)).map((fila) => lista.map(fila, client));
}

async function seccionDeLista(nombre) {
  const { idPagina, codigo } = SECCION_DE_LISTA[nombre];
  return resolverSeccionId(idPagina, codigo);
}

/** Deja `orden` como 1..n sin huecos tras un borrado. */
async function compactarLista(lista, idSeccion) {
  const filas = await filasLista(lista, idSeccion, `${lista.pk}, orden`);
  const pendientes = filas
    .map((fila, index) => ({ id: fila[lista.pk], orden: index + 1, actual: fila.orden }))
    .filter((fila) => fila.orden !== fila.actual);

  await Promise.all(
    pendientes.map(({ id, orden }) =>
      getSupabaseAdminClient().from(lista.tabla).update({ orden }).eq(lista.pk, id),
    ),
  );
}

async function crearItem(lista, valores) {
  const idSeccion = await seccionDeLista(lista.nombre);
  const filas = await filasLista(lista, idSeccion, `${lista.pk}, orden`);

  if (filas.length >= lista.max) {
    throw validation(`Se alcanzó el máximo de ${lista.max} elementos en esta sección.`);
  }

  const orden = filas.reduce((max, fila) => Math.max(max, fila.orden), 0) + 1;
  const { error } = await getSupabaseAdminClient()
    .from(lista.tabla)
    .insert({ ...valores, id_seccion: idSeccion, orden });

  if (error) traducirError(error);

  return itemsLista(lista, idSeccion);
}

async function actualizarItem(lista, id, valores) {
  const idSeccion = await seccionDeLista(lista.nombre);
  const { data, error } = await getSupabaseAdminClient()
    .from(lista.tabla)
    .update(valores)
    .eq(lista.pk, id)
    .eq("id_seccion", idSeccion)
    .select(lista.pk);

  if (error) traducirError(error);
  if (!data?.length) return null;

  return itemsLista(lista, idSeccion);
}

async function eliminarItem(lista, id) {
  const idSeccion = await seccionDeLista(lista.nombre);
  const { data, error } = await getSupabaseAdminClient()
    .from(lista.tabla)
    .delete()
    .eq(lista.pk, id)
    .eq("id_seccion", idSeccion)
    .select(lista.pk);

  if (error) throw error;
  if (!data?.length) return null;

  try {
    await compactarLista(lista, idSeccion);
  } catch {
    logInternalError(`compactar ${lista.tabla}`);
  }

  return itemsLista(lista, idSeccion);
}

async function reordenarItems(lista, ids) {
  const idSeccion = await seccionDeLista(lista.nombre);
  const filas = await filasLista(lista, idSeccion, `${lista.pk}, orden`);
  const actuales = new Map(filas.map((fila) => [fila[lista.pk], fila.orden]));

  if (ids.length !== actuales.size || ids.some((id) => !actuales.has(id))) {
    throw validation("El orden enviado no coincide con los elementos actuales. Recarga la página.");
  }

  const resultados = await Promise.all(
    ids
      .map((id, index) => ({ id, orden: index + 1 }))
      .filter(({ id, orden }) => actuales.get(id) !== orden)
      .map(({ id, orden }) =>
        getSupabaseAdminClient().from(lista.tabla).update({ orden }).eq(lista.pk, id),
      ),
  );

  for (const { error } of resultados) {
    if (error) throw error;
  }

  return itemsLista(lista, idSeccion);
}

export function crearValor(valores) {
  return crearItem(LISTAS.valores, valores);
}

export function actualizarValor(id, valores) {
  return actualizarItem(LISTAS.valores, id, valores);
}

export function eliminarValor(id) {
  return eliminarItem(LISTAS.valores, id);
}

export function reordenarValores(ids) {
  return reordenarItems(LISTAS.valores, ids);
}

export function crearIntegrante(valores) {
  return crearItem(LISTAS.integrantes, valores);
}

export function actualizarIntegrante(id, valores) {
  return actualizarItem(LISTAS.integrantes, id, valores);
}

export async function eliminarIntegrante(id) {
  const anterior = await leerImagenIntegrante(id);
  const items = await eliminarItem(LISTAS.integrantes, id);

  // La foto solo se elimina de Storage si la subió este módulo y nadie más la usa.
  if (items && anterior?.id_imagen) await limpiarImagenHuerfana(anterior.id_imagen);

  return items;
}

export function reordenarIntegrantes(ids) {
  return reordenarItems(LISTAS.integrantes, ids);
}

/* --------------------------------- Imágenes ---------------------------------- */

async function imagenesDeSeccion(idSeccion) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("imagenes_seccion")
    .select(`orden, imagenes ( ${COLUMNAS_IMAGEN} )`)
    .eq("id_seccion", idSeccion);

  if (error) throw error;

  return imagenesOrdenadas(client, data);
}

function exigirImagenes(seccionDef) {
  if (!seccionDef.imagenes) {
    throw validation("Esta sección no admite imágenes.");
  }

  return seccionDef.imagenes.max;
}

/** Biblioteca: imágenes ya registradas en el bucket público, para reutilizarlas. */
export async function listBibliotecaImagenes() {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("imagenes")
    .select(COLUMNAS_IMAGEN)
    .eq("bucket", MEDIA_BUCKET)
    // Los aportes de la comunidad pueden estar pendientes de revisión: no se ofrecen para publicar.
    .not("ruta_imagen", "like", "museo/aportes/%")
    .order("id_imagen", { ascending: false })
    .limit(300);

  if (error) throw error;

  return (data ?? []).map((row) => mapImagen(client, row)).filter(Boolean);
}

/**
 * Elimina físicamente una imagen solo si la subió este módulo (paginas/...) y ya
 * ninguna sección la usa. Las demás (actividades, contenidos, museo) no se tocan.
 */
async function limpiarImagenHuerfana(idImagen) {
  const client = getSupabaseAdminClient();
  const { data: imagen, error } = await client
    .from("imagenes")
    .select(COLUMNAS_IMAGEN)
    .eq("id_imagen", idImagen)
    .maybeSingle();

  if (error || !imagen) return false;
  if (imagen.bucket !== MEDIA_BUCKET || !isPaginaObjectPath(imagen.ruta_imagen)) return false;

  const [enSecciones, enDirectorio] = await Promise.all([
    client.from("imagenes_seccion").select("id_seccion").eq("id_imagen", idImagen).limit(1),
    client.from("integrantes_directorio").select("id_integrante").eq("id_imagen", idImagen).limit(1),
  ]);

  if (enSecciones.error || enDirectorio.error) return false;
  if (enSecciones.data?.length || enDirectorio.data?.length) return false;

  const { error: deleteError } = await client.from("imagenes").delete().eq("id_imagen", idImagen);
  if (deleteError) return false;

  try {
    await deleteImage(imagen.ruta_imagen);
  } catch {
    logInternalError("storage delete imagen de pagina");
  }

  return true;
}

/**
 * Define qué imágenes tiene una sección y en qué orden. Sirve para asociar,
 * reordenar, reemplazar y quitar: quitar solo borra la relación; el archivo físico
 * se elimina únicamente si lo subió este módulo y quedó sin uso.
 */
export async function setImagenesSeccion(idPagina, seccionDef, ids) {
  exigirImagenes(seccionDef);

  const idSeccion = await resolverSeccionId(idPagina, seccionDef.codigo);
  const client = getSupabaseAdminClient();

  if (ids.length > 0) {
    const { data, error } = await client
      .from("imagenes")
      .select("id_imagen")
      .eq("bucket", MEDIA_BUCKET)
      .not("ruta_imagen", "like", "museo/aportes/%")
      .in("id_imagen", ids);

    if (error) throw error;
    if ((data ?? []).length !== ids.length) {
      throw validation("Alguna de las imágenes seleccionadas ya no existe.");
    }
  }

  const { data: actuales, error: actualesError } = await client
    .from("imagenes_seccion")
    .select("id_imagen")
    .eq("id_seccion", idSeccion);

  if (actualesError) throw actualesError;

  if (ids.length > 0) {
    const { error } = await client.from("imagenes_seccion").upsert(
      ids.map((id, index) => ({ id_seccion: idSeccion, id_imagen: id, orden: index + 1 })),
      { onConflict: "id_seccion,id_imagen" },
    );

    if (error) traducirError(error);
  }

  const quitadas = (actuales ?? [])
    .map((fila) => fila.id_imagen)
    .filter((id) => !ids.includes(id));

  if (quitadas.length > 0) {
    const { error } = await client
      .from("imagenes_seccion")
      .delete()
      .eq("id_seccion", idSeccion)
      .in("id_imagen", quitadas);

    if (error) throw error;

    for (const id of quitadas) {
      await limpiarImagenHuerfana(id);
    }
  }

  return imagenesDeSeccion(idSeccion);
}

/** Sube un archivo ya validado, lo registra en `imagenes` y lo asocia al final de la sección. */
export async function subirImagenSeccion(idPagina, seccionDef, { bytes, mime, extension, descripcion }) {
  const max = exigirImagenes(seccionDef);
  const idSeccion = await resolverSeccionId(idPagina, seccionDef.codigo);
  const client = getSupabaseAdminClient();

  const { data: filas, error: filasError } = await client
    .from("imagenes_seccion")
    .select("orden")
    .eq("id_seccion", idSeccion);

  if (filasError) throw filasError;

  if ((filas ?? []).length >= max) {
    throw validation(
      `Esta sección admite hasta ${max} imágenes. Quita una antes de subir otra.`,
    );
  }

  const target = paginaMediaTarget(getPagina(idPagina)?.slug, seccionDef.codigo);
  const path = target ? buildObjectPath(target, extension) : null;

  if (!path) throw validation("No se pudo preparar la ruta de la imagen.");

  await uploadImage({ path, bytes, contentType: mime });

  const { data: imagen, error: imagenError } = await client
    .from("imagenes")
    .insert({ bucket: MEDIA_BUCKET, ruta_imagen: path, descripcion_imagen: descripcion })
    .select("id_imagen")
    .single();

  if (imagenError) {
    await deleteImage(path).catch(() => logInternalError("rollback storage imagen"));
    throw imagenError;
  }

  const orden = (filas ?? []).reduce((acc, fila) => Math.max(acc, fila.orden), 0) + 1;
  const { error: relacionError } = await client
    .from("imagenes_seccion")
    .insert({ id_seccion: idSeccion, id_imagen: imagen.id_imagen, orden });

  if (relacionError) {
    await client.from("imagenes").delete().eq("id_imagen", imagen.id_imagen);
    await deleteImage(path).catch(() => logInternalError("rollback storage imagen"));
    throw relacionError;
  }

  return imagenesDeSeccion(idSeccion);
}

/* ------------------------- Fotografía de integrantes ------------------------- */

/** Integrante del directorio y su foto actual; null si no existe. */
async function leerImagenIntegrante(id) {
  const idSeccion = await seccionDeLista("integrantes");
  const { data, error } = await getSupabaseAdminClient()
    .from("integrantes_directorio")
    .select("id_integrante, nombre_integrante, id_imagen")
    .eq("id_integrante", id)
    .eq("id_seccion", idSeccion)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function asignarImagenIntegrante(id, idImagen, anterior) {
  const { error } = await getSupabaseAdminClient()
    .from("integrantes_directorio")
    .update({ id_imagen: idImagen })
    .eq("id_integrante", id);

  if (error) traducirError(error);

  if (anterior && anterior !== idImagen) await limpiarImagenHuerfana(anterior);

  return itemsLista(LISTAS.integrantes, await seccionDeLista("integrantes"));
}

/**
 * Asigna una imagen ya registrada (biblioteca) como foto del integrante, o la quita
 * con `null`. Quitar solo elimina la relación; el archivo físico se borra únicamente
 * si lo subió este módulo y ya nada lo usa.
 */
export async function setImagenIntegrante(id, idImagen) {
  const integrante = await leerImagenIntegrante(id);

  if (!integrante) return null;

  if (idImagen !== null) {
    const { data, error } = await getSupabaseAdminClient()
      .from("imagenes")
      .select("id_imagen")
      .eq("id_imagen", idImagen)
      .eq("bucket", MEDIA_BUCKET)
      .not("ruta_imagen", "like", "museo/aportes/%")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw validation("La imagen seleccionada ya no existe.");
  }

  return asignarImagenIntegrante(id, idImagen, integrante.id_imagen);
}

/** Sube un archivo ya validado, lo registra en `imagenes` y lo deja como foto del integrante. */
export async function subirImagenIntegrante(id, { bytes, mime, extension }) {
  const integrante = await leerImagenIntegrante(id);

  if (!integrante) return null;

  const client = getSupabaseAdminClient();
  const { idPagina, codigo } = SECCION_DE_LISTA.integrantes;
  const target = paginaMediaTarget(getPagina(idPagina)?.slug, codigo);
  const path = target ? buildObjectPath(target, extension) : null;

  if (!path) throw validation("No se pudo preparar la ruta de la imagen.");

  await uploadImage({ path, bytes, contentType: mime });

  const { data: imagen, error: imagenError } = await client
    .from("imagenes")
    .insert({
      bucket: MEDIA_BUCKET,
      ruta_imagen: path,
      descripcion_imagen: `Fotografía de ${integrante.nombre_integrante}`,
    })
    .select("id_imagen")
    .single();

  if (imagenError) {
    await deleteImage(path).catch(() => logInternalError("rollback storage imagen"));
    throw imagenError;
  }

  try {
    return await asignarImagenIntegrante(id, imagen.id_imagen, integrante.id_imagen);
  } catch (error) {
    await client.from("imagenes").delete().eq("id_imagen", imagen.id_imagen);
    await deleteImage(path).catch(() => logInternalError("rollback storage imagen"));
    throw error;
  }
}

export async function actualizarImagen(idImagen, descripcion) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("imagenes")
    .update({ descripcion_imagen: descripcion })
    .eq("id_imagen", idImagen)
    .eq("bucket", MEDIA_BUCKET)
    .select(COLUMNAS_IMAGEN);

  if (error) throw error;

  return data?.length ? mapImagen(client, data[0]) : null;
}
