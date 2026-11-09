import "server-only";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { AIError, DEFAULT_AI_CONFIG } from "../../lib/ai/contracts.mjs";

// Single-process durable development store. No conversations are written here.
export function createLocalAIStore(directory) {
  const file = join(directory, "store.json");
  let queue = Promise.resolve();
  async function read() {
    try {
      const data = JSON.parse(await readFile(file, "utf8"));
      if (data.version !== 1 || !data.config || !Array.isArray(data.knowledge)) throw new Error("Invalid local store");
      return data;
    } catch (error) {
      if (error.code === "ENOENT") return { version: 1, config: { ...DEFAULT_AI_CONFIG }, knowledge: [] };
      throw new AIError(503, "AI_STORAGE_UNAVAILABLE", "No se pudo leer la información del asistente. Inténtalo más tarde.");
    }
  }
  function mutate(operation) {
    const task = queue.then(async () => {
      const data = await read();
      const result = operation(data);
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, randomUUID() + ".tmp");
      await writeFile(temporary, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
      await rename(temporary, file);
      return result;
    });
    queue = task.catch(() => {});
    return task;
  }
  return {
    async getConfig() { return (await read()).config; },
    async saveConfig(value) { return mutate((data) => (data.config = { ...value })); },
    async listKnowledge() { return (await read()).knowledge.sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo)); },
    async saveKnowledge(id, value) {
      return mutate((data) => {
        const index = data.knowledge.findIndex((item) => item.id === id);
        if (id && index < 0) throw new AIError(404, "NOT_FOUND", "La sección ya no existe.");
        if (!id && data.knowledge.length >= 200) throw new AIError(409, "KNOWLEDGE_LIMIT", "Puedes mantener hasta 200 secciones. Organiza las existentes antes de agregar otra.");
        const now = new Date().toISOString();
        const row = { ...value, id: id || randomUUID(), created_at: index < 0 ? now : data.knowledge[index].created_at, updated_at: now };
        if (index < 0) data.knowledge.push(row); else data.knowledge[index] = row;
        return row;
      });
    },
    async deleteKnowledge(id) {
      return mutate((data) => {
        if (!data.knowledge.some((item) => item.id === id)) throw new AIError(404, "NOT_FOUND", "La sección ya no existe.");
        data.knowledge = data.knowledge.filter((item) => item.id !== id);
      });
    },
  };
}
