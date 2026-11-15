import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AIError } from "@/lib/ai/contracts.mjs";
import { jsonError } from "@/lib/http";
import { requireGestorContenido } from "@/lib/auth/guard";

export function noStore(response) { response.headers.set("Cache-Control", "no-store"); return response; }
export async function readAIBody(request, maxBytes = 12000) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AIError(415, "CONTENT_TYPE", "Envía información en formato válido.");
  if (!request.body) throw new AIError(400, "VALIDATION", "La solicitud está vacía.");
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new AIError(413, "TOO_LARGE", "La información enviada es demasiado larga."); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(400, "VALIDATION", "La información enviada no es válida.");
  } finally { reader.releaseLock(); }
}
export async function runAI(operation) {
  try { return noStore(await operation()); }
  catch (error) {
    if (error instanceof AIError) {
      const response = noStore(jsonError(error.status, error.code, error.message));
      if (error.status === 429) response.headers.set("Retry-After", "60");
      return response;
    }
    // Never log queries, bodies, credentials or provider/DB error objects.
    return noStore(jsonError(503, "AI_UNAVAILABLE", "No pudimos atender la consulta. Inténtalo de nuevo más tarde."));
  }
}
export async function runAdminAI(request, operation) {
  return runAI(async () => {
    const auth = await requireGestorContenido(request);
    if (auth.response) return auth.response;
    return operation();
  });
}
export function createChatLimiter({ now = Date.now, perClient = 10, globalLimit = 100, windowMs = 60000 } = {}) {
  const salt = randomBytes(16).toString("hex");
  const clients = new Map(); let globalStart = 0, globalCount = 0, active = 0;
  return (request) => {
    const time = now();
    if (time - globalStart >= windowMs) { globalStart = time; globalCount = 0; clients.clear(); }
    const raw = (request.headers.get("x-forwarded-for") || "shared").split(",")[0].trim().slice(0, 128);
    const key = createHash("sha256").update(salt + raw).digest("hex");
    const count = clients.get(key) || 0;
    if (count >= perClient || globalCount >= globalLimit || active >= 8 || (!clients.has(key) && clients.size >= 1000)) throw new AIError(429, "RATE_LIMIT", "Recibimos muchas consultas. Espera un minuto y vuelve a intentarlo.");
    clients.set(key, count + 1); globalCount++; active++;
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  };
}
export const limitChat = createChatLimiter();
