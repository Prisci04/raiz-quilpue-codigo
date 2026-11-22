import "server-only";

import {
  findCatalogoByNombre,
  NOMBRE_COMUNA_DEFAULT,
  NOMBRE_REGION_DEFAULT,
} from "@/lib/catalogos.mjs";
import { listCatalogo } from "@/services/catalogos.service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const LUGAR_COLUMNS =
  "id_lugar,nombre_lugar,direccion,google_place_id,latitud,longitud,id_comuna";

const LUGAR_LIST_COLUMNS = `
  ${LUGAR_COLUMNS},
  comuna (
    id_comuna,
    nombre_comuna,
    id_region,
    region (
      id_region,
      nombre_region
    )
  )
`;

const UNIQUE_VIOLATION = "23505";

function queryFailed(label, error) {
  const failure = new Error(label);
  failure.code = error?.code ?? "QUERY_FAILED";
  return failure;
}

function mapLugar(row) {
  if (!row) {
    return null;
  }

  const comuna = Array.isArray(row.comuna) ? row.comuna[0] : row.comuna;
  const region = Array.isArray(comuna?.region) ? comuna.region[0] : comuna?.region;

  return {
    id: row.id_lugar,
    nombre: row.nombre_lugar,
    direccion: row.direccion,
    google_place_id: row.google_place_id ?? null,
    latitud: row.latitud ?? null,
    longitud: row.longitud ?? null,
    id_comuna: row.id_comuna,
    comuna: comuna?.nombre_comuna ?? null,
    id_region: comuna?.id_region ?? null,
    region: region?.nombre_region ?? null,
  };
}

export async function listRegiones() {
  return listCatalogo("region");
}

export async function listComunas(idRegion) {
  const comunas = await listCatalogo("comuna");

  if (!idRegion) {
    return comunas;
  }

  return comunas.filter((comuna) => Number(comuna.id_region) === Number(idRegion));
}

export async function getUbicacionesDefault() {
  const [regiones, comunas] = await Promise.all([
    listRegiones(),
    listComunas(),
  ]);

  const region = findCatalogoByNombre(regiones, NOMBRE_REGION_DEFAULT);
  const comuna = comunas.find(
    (item) =>
      item.nombre.trim().toLowerCase() === NOMBRE_COMUNA_DEFAULT.toLowerCase() &&
      Number(item.id_region) === Number(region?.id),
  );

  return {
    regiones,
    comunas,
    id_region: region?.id ?? null,
    id_comuna: comuna?.id ?? null,
  };
}

export async function listLugares({ idComuna } = {}) {
  let query = getSupabaseServerClient()
    .from("lugar")
    .select(LUGAR_LIST_COLUMNS)
    .order("nombre_lugar", { ascending: true })
    .order("id_lugar", { ascending: true });

  if (idComuna) {
    query = query.eq("id_comuna", idComuna);
  }

  const { data, error } = await query;

  if (error) {
    throw queryFailed("Failed to list lugares", error);
  }

  return (data ?? []).map(mapLugar);
}

export async function getLugarById(id) {
  const { data, error } = await getSupabaseAdminClient()
    .from("lugar")
    .select(LUGAR_LIST_COLUMNS)
    .eq("id_lugar", id)
    .maybeSingle();

  if (error) {
    throw queryFailed("Failed to get lugar", error);
  }

  return mapLugar(data);
}

function exactIlike(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function resolveLugarForActividad(lugar) {
  const direccion = typeof lugar?.direccion === "string" ? lugar.direccion.trim() : "";
  const idComuna = Number(lugar?.id_comuna);

  if (!direccion || !Number.isInteger(idComuna) || idComuna < 1) {
    const failure = new Error("Missing lugar for actividad");
    failure.code = "LUGAR_REQUIRED";
    throw failure;
  }

  const client = getSupabaseAdminClient();
  const placeId = typeof lugar.google_place_id === "string" ? lugar.google_place_id.trim() : "";

  if (placeId) {
    const { data, error } = await client
      .from("lugar")
      .select(LUGAR_LIST_COLUMNS)
      .eq("google_place_id", placeId)
      .maybeSingle();

    if (error) {
      throw queryFailed("Failed to resolve lugar", error);
    }

    if (data) {
      return mapLugar(data).id;
    }
  }

  const { data, error } = await client
    .from("lugar")
    .select(LUGAR_LIST_COLUMNS)
    .eq("id_comuna", idComuna)
    .ilike("direccion", exactIlike(direccion))
    .limit(1);

  if (error) {
    throw queryFailed("Failed to resolve lugar", error);
  }

  if (data?.[0]) {
    return mapLugar(data[0]).id;
  }

  try {
    const created = await createLugar({
      nombre_lugar: (lugar.nombre_lugar || direccion).slice(0, 150),
      direccion,
      id_comuna: idComuna,
      google_place_id: placeId || null,
      latitud: lugar.latitud ?? null,
      longitud: lugar.longitud ?? null,
    });
    return created.id;
  } catch (createError) {
    if (createError.code === "LUGAR_TAKEN" && placeId) {
      const { data: existing, error: existingError } = await client
        .from("lugar")
        .select(LUGAR_LIST_COLUMNS)
        .eq("google_place_id", placeId)
        .maybeSingle();

      if (existingError) {
        throw queryFailed("Failed to resolve lugar", existingError);
      }

      if (existing) {
        return mapLugar(existing).id;
      }
    }

    throw createError;
  }
}

export async function createLugar(input) {
  const { data, error } = await getSupabaseAdminClient()
    .from("lugar")
    .insert(input)
    .select(LUGAR_LIST_COLUMNS)
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    const conflict = new Error("Ya existe un lugar con ese identificador de Google.");
    conflict.code = "LUGAR_TAKEN";
    throw conflict;
  }

  if (error) {
    throw queryFailed("Failed to create lugar", error);
  }

  return mapLugar(data);
}

export async function updateLugar(id, input) {
  const { data, error } = await getSupabaseAdminClient()
    .from("lugar")
    .update(input)
    .eq("id_lugar", id)
    .select(LUGAR_LIST_COLUMNS)
    .maybeSingle();

  if (error?.code === UNIQUE_VIOLATION) {
    const conflict = new Error("Ya existe un lugar con ese identificador de Google.");
    conflict.code = "LUGAR_TAKEN";
    throw conflict;
  }

  if (error) {
    throw queryFailed("Failed to update lugar", error);
  }

  return mapLugar(data);
}
