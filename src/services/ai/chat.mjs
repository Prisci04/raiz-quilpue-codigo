import "server-only";
import { AIError, parseChat } from "../../lib/ai/contracts.mjs";
import { retrieveContext } from "./context.mjs";
import { getAIProvider } from "./providers.mjs";

export async function answerChat(input, { getConfig, knowledge, searchPublic, provider = getAIProvider(), signal }) {
  const { message, history } = parseChat(input);
  const config = await getConfig();
  if (!config.activo) throw new AIError(503, "AI_DISABLED", "El asistente está descansando. Puedes seguir explorando el sitio y volver más tarde.");
  if (signal?.aborted) throw new AIError(408, "CANCELLED", "La consulta se canceló.");
  const { documents } = await retrieveContext(message, { knowledge, searchPublic });
  if (signal?.aborted) throw new AIError(408, "CANCELLED", "La consulta se canceló.");
  return provider.respond({ message, history, config, context: documents, signal });
}
