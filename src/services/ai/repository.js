import "server-only";
import { join } from "node:path";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AIError, DEFAULT_AI_CONFIG, parseAIConfig, parseKnowledge } from "@/lib/ai/contracts.mjs";
import { createLocalAIStore } from "./local-store.mjs";

const local = createLocalAIStore(join(process.cwd(), ".local", "ia"));
function check({ data, error }) {
  if (error?.code === "P0001" && error?.message === "KNOWLEDGE_LIMIT") throw new AIError(409, "KNOWLEDGE_LIMIT", "Puedes mantener hasta 200 secciones. Organiza las existentes antes de agregar otra.");
  if (error) throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "La información del asistente no está disponible. Solicita revisar su habilitación.");
  return data;
}
const configColumns = "activo,nombre,mensaje_inicial,mensaje_desconocido,instrucciones,created_at,updated_at";
const knowledgeColumns = "id,titulo,categoria,contenido,orden,activo,created_at,updated_at";
async function execute(query) {
  try { return check(await query.abortSignal(AbortSignal.timeout(5000))); }
  catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "La información del asistente no está disponible. Solicita revisar su habilitación.");
  }
}
export function createSupabaseAIStore(client) {
  return {
    async getConfig() {
      const row = await execute(client.from("ia_configuracion").select(configColumns).eq("id", 1).single());
      if (!row) throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "Falta habilitar la configuración del asistente.");
      return row;
    },
    async saveConfig(value) { return execute(client.from("ia_configuracion").update(parseAIConfig(value)).eq("id", 1).select(configColumns).single()); },
    async listKnowledge() { return execute(client.from("ia_conocimiento").select(knowledgeColumns).order("orden").order("titulo").limit(200)); },
    async searchKnowledge(terms) {
      const safe = terms.filter((term) => /^[a-z0-9]{3,}$/.test(term)).slice(0, 6);
      if (!safe.length) return [];
      return execute(client.from("ia_conocimiento").select("titulo,categoria,contenido,orden,activo").eq("activo", true)
        .or(safe.flatMap((term) => ["titulo", "categoria", "contenido"].map((field) => `${field}.ilike.%${term}%`)).join(","))
        .order("orden").order("titulo").limit(30));
    },
    async saveKnowledge(id, value) {
      if (!id) {
        const capacity = await client.from("ia_conocimiento").select("id", { count: "exact", head: true }).abortSignal(AbortSignal.timeout(5000));
        check(capacity);
        if (typeof capacity.count !== "number") throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "No se pudo comprobar el espacio disponible.");
        if (capacity.count >= 200) throw new AIError(409, "KNOWLEDGE_LIMIT", "Puedes mantener hasta 200 secciones. Organiza las existentes antes de agregar otra.");
      }
      const clean = parseKnowledge(value);
      const query = id ? client.from("ia_conocimiento").update(clean).eq("id", id) : client.from("ia_conocimiento").insert(clean);
      const row = await execute(query.select(knowledgeColumns).maybeSingle());
      if (!row) throw new AIError(404, "NOT_FOUND", "La sección ya no existe.");
      return row;
    },
    async deleteKnowledge(id) {
      const rows = await execute(client.from("ia_conocimiento").delete().eq("id", id).select("id"));
      if (!rows?.length) throw new AIError(404, "NOT_FOUND", "La sección ya no existe.");
    },
  };
}
export function getAIStorageMode(env = process.env) {
  const mode = env.AI_STORAGE || (env.NODE_ENV === "production" ? "supabase" : "local");
  if (!["local", "supabase"].includes(mode)) throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "El almacenamiento de IA no está habilitado.");
  return mode;
}
export function getAIRepository() {
  const mode = getAIStorageMode();
  if (mode === "local") return local;
  if (mode === "supabase") return createSupabaseAIStore(getSupabaseAdminClient());
  throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "El asistente no está disponible temporalmente.");
}
export async function getAIConfig() {
  return { ...DEFAULT_AI_CONFIG, ...await getAIRepository().getConfig() };
}
