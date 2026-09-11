/**
 * cliente que usa la pagina Activdades para obtener las actividades publicas
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

  return payload.data ?? [];
}
