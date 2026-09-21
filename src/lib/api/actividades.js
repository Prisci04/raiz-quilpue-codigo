/**
 * cliente que usa la pagina Actividades para obtener las actividades publicas
 */

import { headers } from "next/headers";

async function getInternalOrigin() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!host) {
    throw new Error("Error al obtener las actividades.");
  }

  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

function formatHoraInicio(hora) {
  if (!hora) return "";

  const [hours, minutes] = String(hora).split(":");

  if (!hours || !minutes) return String(hora);

  return `${hours}:${minutes} hrs`;
}

export function mapActividadPublica(actividad) {
  if (!actividad) return null;

  return {
    id: actividad.id,
    title: actividad.titulo ?? "",
    description: actividad.descripcion ?? "",
    fullDescription: actividad.descripcion ?? "",
    date: actividad.fecha,
    time: formatHoraInicio(actividad.hora_inicio),
    location: actividad.ubicacion ?? "",
    image: actividad.imagen_url ?? null,
    cupos: Number(actividad.cupos) || 0,
  };
}

export async function fetchActividadesPublicas({ page = 1, limit = 10 } = {}) {
  const origin = await getInternalOrigin();
  const url = new URL("/api/actividades", origin);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error("Error al obtener las actividades.");
  }

  return (payload.data ?? []).map(mapActividadPublica);
}

export async function fetchActividadPublicaById(id) {
  const origin = await getInternalOrigin();
  const url = new URL(`/api/actividades/${id}`, origin);
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (response.status === 404 || payload?.error?.code === "ACTIVITY_NOT_FOUND") {
    return null;
  }

  if (!response.ok || !payload?.success) {
    throw new Error("Error al obtener la actividad.");
  }

  return mapActividadPublica(payload.data);
}
