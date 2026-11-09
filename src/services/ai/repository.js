import "server-only";
import { join } from "node:path";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AIError, DEFAULT_AI_CONFIG } from "@/lib/ai/contracts.mjs";
import { createLocalAIStore } from "./local-store.mjs";

const local = createLocalAIStore(join(process.cwd(), ".local", "ia"));
function check({ data, error }) {
  if (error) throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "La información del asistente no está disponible. Solicita revisar su habilitación.");
  return data;
}
export function createSupabaseAIStore(client) {
  return {
    async getConfig() { return check(await client.from("ia_configuracion").select("activo,nombre,mensaje_inicial,mensaje_desconocido,instrucciones").eq("id", 1).single()); },
    async saveConfig(value) { return check(await client.from("ia_configuracion").update(value).eq("id", 1).select().single()); },
    async listKnowledge() { return check(await client.from("ia_conocimiento").select("id,titulo,categoria,contenido,orden,activo,created_at,updated_at").order("orden").order("titulo").limit(200)); },
    async saveKnowledge(id, value) {
      if (!id) {
        const capacity = await client.from("ia_conocimiento").select("id", { count: "exact", head: true });
        check(capacity);
        if (typeof capacity.count !== "number") throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "No se pudo comprobar el espacio disponible.");
        if (capacity.count >= 200) throw new AIError(409, "KNOWLEDGE_LIMIT", "Puedes mantener hasta 200 secciones. Organiza las existentes antes de agregar otra.");
      }
      const query = id ? client.from("ia_conocimiento").update(value).eq("id", id) : client.from("ia_conocimiento").insert(value);
      const row = check(await query.select().maybeSingle());
      if (!row) throw new AIError(404, "NOT_FOUND", "La sección ya no existe.");
      return row;
    },
    async deleteKnowledge(id) {
      const rows = check(await client.from("ia_conocimiento").delete().eq("id", id).select("id"));
      if (!rows?.length) throw new AIError(404, "NOT_FOUND", "La sección ya no existe.");
    },
  };
}
export function getAIRepository() {
  const mode = process.env.AI_STORAGE || "local";
  if (mode === "local") return local;
  if (mode === "supabase") return createSupabaseAIStore(getSupabaseAdminClient());
  throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "El asistente no está disponible temporalmente.");
}
export async function getAIConfig() {
  return { ...DEFAULT_AI_CONFIG, ...await getAIRepository().getConfig() };
}
