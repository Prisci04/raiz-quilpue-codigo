import "server-only";

import {
  CATALOGO_ACTIVIDAD_NOMBRES,
  CATALOGO_CONTENIDO_NOMBRES,
  CATALOGO_MUSEO_NOMBRES,
  getCatalogoDef,
  isCatalogoPublico,
  mapCatalogoRow,
} from "@/lib/catalogos.mjs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function queryFailed(nombre) {
  throw new Error(`Failed to list ${nombre}`);
}

function clientFor(def) {
  return def.client === "admin"
    ? getSupabaseAdminClient()
    : getSupabaseServerClient();
}

export async function listCatalogo(nombre, { admin = false } = {}) {
  const def = getCatalogoDef(nombre);

  if (!def) {
    throw new Error(`Unknown catalog: ${nombre}`);
  }

  if (!isCatalogoPublico(nombre) && !admin) {
    throw new Error(`Catalog ${nombre} requires admin access`);
  }

  const columns = [def.idColumn, def.nombreColumn, ...(def.extraColumns ?? [])].join(",");
  const supabase = admin ? getSupabaseAdminClient() : clientFor(def);
  const { data, error } = await supabase
    .from(def.table)
    .select(columns)
    .order(def.idColumn, { ascending: true });

  if (error) {
    queryFailed(nombre);
  }

  return (data ?? []).map((row) => mapCatalogoRow(def, row));
}

export async function listCatalogos(nombres, options) {
  const unique = [...new Set(nombres)];
  const entries = await Promise.all(
    unique.map(async (nombre) => [nombre, await listCatalogo(nombre, options)]),
  );

  return Object.fromEntries(entries);
}

export async function listCatalogosActividad() {
  return listCatalogos(CATALOGO_ACTIVIDAD_NOMBRES);
}

export async function listCatalogosContenido() {
  return listCatalogos(CATALOGO_CONTENIDO_NOMBRES);
}

export async function listCatalogosMuseo() {
  return listCatalogos(CATALOGO_MUSEO_NOMBRES, { admin: true });
}

export async function listCatalogosPublicos(nombres) {
  const requested = nombres?.length ? nombres : CATALOGO_ACTIVIDAD_NOMBRES;

  for (const nombre of requested) {
    if (!isCatalogoPublico(nombre)) {
      const error = new Error(`Catalog ${nombre} is not public`);
      error.code = "CATALOG_FORBIDDEN";
      throw error;
    }
  }

  return listCatalogos(requested);
}
