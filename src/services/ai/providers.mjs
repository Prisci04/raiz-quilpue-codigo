import "server-only";
import { readQwenServerConfig } from "./qwen-config.mjs";

export const mockProvider = {
  async respond({ config, context }) {
    if (!context.length) return { answer: config.mensaje_desconocido, sources: [], mode: "mock" };
    const selected = context.slice(0, 2);
    return { answer: selected.map((doc) => `${doc.titulo}: ${doc.contenido}`).join("\n\n").slice(0, 1500),
      sources: context.filter((doc) => doc.href).map(({ titulo, href }) => ({ title: titulo, href })).filter((doc, i, rows) => rows.findIndex((row) => row.href === doc.href) === i).slice(0, 3),
      mode: "mock" };
  },
};

// Future adapter contract: respond({message, history, config, context, signal}).
// Deliberately performs NO external requests, even when credentials are present.
export function getAIProvider(env = process.env) {
  if (env.AI_PROVIDER === "qwen") {
    const { configured } = readQwenServerConfig(env);
    return { ...mockProvider, pending: configured ? "qwen-not-connected" : "qwen-not-configured" };
  }
  return mockProvider;
}
