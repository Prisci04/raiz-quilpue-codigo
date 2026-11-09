import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const about = { titulo: "Quiénes somos · Raíz Quilpué", tipo: "contenido", href: "/quienes-somos",
  contenido: "Raíz Quilpué es una corporación cultural e histórica sin fines de lucro que trabaja en rescatar, preservar y difundir la historia, la cultura y la identidad local. Su trabajo se proyecta hacia la creación de un museo y centro cultural comunitario de Quilpué." };

export async function searchPublicContext(terms, client) {
  const suppliedClient = Boolean(client);
  try { client ??= getSupabaseServerClient(); } catch { return [about]; }
  // Explicit public projections only. Museo uses the existing server-side approval filter.
  const specs = [
    { table: "actividades", columns: "id_actividad,titulo,descripcion,fecha,hora_inicio,estado_publicacion!inner(nombre_estado)", fields: ["titulo", "descripcion"],
      generic: terms.some((term) => ["actividades", "eventos", "talleres"].includes(term)),
      filter: ["estado_publicacion.nombre_estado", "Publicada"], map: (row) => ({ titulo: row.titulo, categoria: "Actividades eventos talleres", contenido: `${row.descripcion || ""} Fecha: ${row.fecha}${row.hora_inicio ? " · " + row.hora_inicio : ""}. Consulta su ficha para confirmar los detalles.`, href: `/actividades/${row.id_actividad}`, tipo: "actividad" }) },
    { table: "contenidos", columns: "id_contenido,titulo,descripcion,resumen,estado_publicacion!inner(nombre_estado)", fields: ["titulo", "descripcion", "resumen"],
      filter: ["estado_publicacion.nombre_estado", "Publicada"], map: (row) => ({ titulo: row.titulo, contenido: row.resumen || row.descripcion || "", href: `/contenido/${row.id_contenido}`, tipo: "contenido" }) },
    // Mirror the existing public museo service; no contributor identity is selected.
    { table: "museo_aportes", columns: "id_aporte,titulo,descripcion,estado_revision!inner(nombre_estado_revision)", fields: ["titulo", "descripcion"],
      filter: ["estado_revision.nombre_estado_revision", "Aprobado"],
      generic: terms.some((term) => ["museo", "colecciones", "piezas"].includes(term)),
      map: (row) => ({ titulo: row.titulo, categoria: "Museo colecciones piezas", contenido: row.descripcion || "", href: "/museo", tipo: "museo" }) },
    { table: "lugar", columns: "id_lugar,nombre_lugar,direccion", fields: ["nombre_lugar", "direccion"],
      map: (row) => ({ titulo: row.nombre_lugar, contenido: row.direccion || "", href: "/actividades", tipo: "lugar" }) },
  ];
  const results = await Promise.allSettled(specs.map(async (spec) => {
    // Terms contain alphanumerics only; no PostgREST operators can be injected.
    const safe = terms.filter((term) => /^[a-z0-9]{3,}$/.test(term)).slice(0, 3);
    if (!safe.length) return [];
    const sourceClient = !suppliedClient && spec.table === "museo_aportes" ? getSupabaseAdminClient() : client;
    let query = sourceClient.from(spec.table).select(spec.columns).limit(8);
    if (!spec.generic) query = query.or(safe.flatMap((term) => spec.fields.map((field) => `${field}.ilike.%${term}%`)).join(","));
    if (spec.generic && spec.table === "actividades") {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const part = (type) => parts.find((item) => item.type === type).value;
      query = query.gte("fecha", `${part("year")}-${part("month")}-${part("day")}`).order("fecha", { ascending: true });
    }
    if (spec.filter) query = query.eq(...spec.filter);
    const { data, error } = await query.abortSignal(AbortSignal.timeout(2500));
    if (error) throw new Error("Public context unavailable");
    return (data ?? []).map(spec.map);
  }));
  // Individual source outages must not discard the remaining public/editorial context.
  return [about, ...results.flatMap((result) => result.status === "fulfilled" ? result.value : [])];
}
